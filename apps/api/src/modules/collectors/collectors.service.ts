import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma} from '@prisma/client';
import { EntityStatus, Role } from '@prisma/client';
import type {
  AdminPersonCreateInput,
  AdminPersonPatchInput,
  CollectorNearbyOrdersQueryInput,
  CollectorSelfUpdateInput,
  EntityStatusInput,
  PersonListQueryInput,
} from '@eco-oil/validation';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/auth.types';

@Injectable()
export class CollectorsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: AdminPersonCreateInput) {
    await this.requireUser(input.user_id, Role.COLLECTOR);
    await this.requireWards(input.ward_ids);
    const existing = await this.prisma.collector.findUnique({ where: { userId: input.user_id } });
    if (existing) {
      throw new ConflictException('Collector profile already exists');
    }
    const row = await this.prisma.collector.create({
      data: { userId: input.user_id, displayName: input.display_name, collectorWards: { create: input.ward_ids.map((wardId) => ({ wardId })) } },
      include: { user: true, collectorWards: { include: { ward: true } } },
    });
    return this.serialize(row);
  }

  async update(id: string, input: AdminPersonPatchInput) {
    await this.getRequired(id);
    if (input.user_id) {
      await this.requireUser(input.user_id, Role.COLLECTOR);
    }
    if (input.ward_ids) {
      await this.requireWards(input.ward_ids);
    }
    const row = await this.prisma.collector.update({
      where: { id },
      data: {
        ...(input.user_id ? { userId: input.user_id } : {}),
        ...(input.display_name ? { displayName: input.display_name } : {}),
      },
      include: { user: true, collectorWards: { include: { ward: true } } },
    });
    if (input.ward_ids) {
      await this.prisma.$transaction(async (tx) => {
        await tx.collectorWard.deleteMany({ where: { collectorId: id } });
        await tx.collectorWard.createMany({ data: input.ward_ids!.map((wardId) => ({ collectorId: id, wardId })) });
      });
    }
    return this.serialize(row);
  }

  async updateStatus(id: string, input: EntityStatusInput) {
    await this.getRequired(id);
    const row = await this.prisma.collector.update({
      where: { id },
      data: { status: input.status, isActive: input.status === EntityStatus.ACTIVE, deletedAt: input.status === EntityStatus.INACTIVE ? new Date() : null },
      include: { user: true, collectorWards: { include: { ward: true } } },
    });
    return this.serialize(row);
  }

  async list(query: PersonListQueryInput) {
    const where: Prisma.CollectorWhereInput = {
      ...(query.ward_id ? { collectorWards: { some: { wardId: query.ward_id } } } : {}),
      ...(query.status ? { status: query.status } : query.include_inactive ? {} : { status: EntityStatus.ACTIVE }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.collector.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { user: true, collectorWards: { include: { ward: true } } },
      }),
      this.prisma.collector.count({ where }),
    ]);
    return { data: rows.map((row) => this.serialize(row)), meta: { page: query.page, limit: query.limit, total } };
  }

  async findOne(id: string) {
    return this.serialize(await this.getRequired(id));
  }

  /** Hồ sơ của chính người thu gom đang đăng nhập. */
  async findMine(user: AccessTokenPayload) {
    return this.serializeProfile(await this.requireOwnProfile(user.sub));
  }

  async updateMine(user: AccessTokenPayload, input: CollectorSelfUpdateInput) {
    const current = await this.requireOwnProfile(user.sub);
    const row = await this.prisma.collector.update({
      where: { id: current.id },
      data: {
        ...(input.display_name === undefined ? {} : { displayName: input.display_name }),
        ...(input.contact_phone === undefined ? {} : { contactPhone: input.contact_phone }),
        ...(input.vehicle_type === undefined ? {} : { vehicleType: input.vehicle_type }),
        ...(input.max_capacity_l === undefined ? {} : { maxCapacityLiters: input.max_capacity_l }),
      },
      include: { user: true, collectorWards: { include: { ward: true } } },
    });
    return this.serializeProfile(row);
  }

  /**
   * Các đơn READY trong phường người thu gom phụ trách, giới hạn theo bán kính
   * quanh vị trí hiện tại. Chỉ trả điểm thuộc địa bàn được phân công.
   */
  async nearbyOrders(user: AccessTokenPayload, query: CollectorNearbyOrdersQueryInput) {
    const collector = await this.requireOwnProfile(user.sub);
    const wardIds = collector.collectorWards.map((item) => item.wardId);
    if (wardIds.length === 0) return [];

    const hasOrigin = query.lat !== undefined && query.lng !== undefined;
    const rows = await this.prisma.$queryRaw<Array<{
      order_id: string;
      merchant_name: string;
      address: string | null;
      phone: string | null;
      lat: number | null;
      lng: number | null;
      expected_liters: number | null;
      container_code: string | null;
      requested_at: Date;
      distance_m: number | null;
      in_current_route: boolean;
      ward_id: string;
      ward_name: string;
      ward_district: string;
    }>>`
      SELECT o."id" AS "order_id",
        m."business_name" AS "merchant_name",
        m."address",
        u."phone",
        ST_Y(m."location"::geometry)::float8 AS "lat",
        ST_X(m."location"::geometry)::float8 AS "lng",
        o."expected_liters"::float8 AS "expected_liters",
        c."qr_code" AS "container_code",
        o."requested_at",
        CASE WHEN ${hasOrigin}::boolean AND m."location" IS NOT NULL
          THEN ST_Distance(m."location", ST_SetSRID(ST_MakePoint(${query.lng ?? 0}, ${query.lat ?? 0}), 4326)::geography)::float8
          ELSE NULL END AS "distance_m",
        EXISTS (
          SELECT 1 FROM "collection_route_stops" rs
          JOIN "collection_routes" r ON r."id" = rs."route_id"
          WHERE rs."order_id" = o."id" AND r."collector_id" = ${collector.id}::uuid AND r."status" = 'ACTIVE'
        ) AS "in_current_route",
        w."id" AS "ward_id", w."name" AS "ward_name", w."district" AS "ward_district"
      FROM "collection_orders" o
      JOIN "merchants" m ON m."id" = o."merchant_id"
      JOIN "wards" w ON w."id" = m."ward_id"
      JOIN "users" u ON u."id" = m."user_id"
      LEFT JOIN "containers" c ON c."id" = o."container_id"
      WHERE o."status" = 'READY'
        AND o."deleted_at" IS NULL
        AND m."deleted_at" IS NULL
        AND m."ward_id" = ANY(${wardIds}::uuid[])
        AND (
          NOT ${hasOrigin}::boolean
          OR m."location" IS NULL
          OR ST_DWithin(m."location", ST_SetSRID(ST_MakePoint(${query.lng ?? 0}, ${query.lat ?? 0}), 4326)::geography, ${query.radius_m})
        )
      ORDER BY "distance_m" ASC NULLS LAST, o."requested_at" ASC
      LIMIT 200
    `;

    return rows.map((row) => ({
      order_id: row.order_id,
      merchant_name: row.merchant_name,
      address: row.address,
      phone: row.phone,
      lat: row.lat ?? 0,
      lng: row.lng ?? 0,
      expected_liters: row.expected_liters === null ? null : Number(row.expected_liters),
      container_code: row.container_code,
      requested_at: row.requested_at.toISOString(),
      distance_m: row.distance_m === null ? null : Number(row.distance_m),
      in_current_route: row.in_current_route,
      ward: { id: row.ward_id, name: row.ward_name, district: row.ward_district },
    }));
  }

  private async requireOwnProfile(userId: string) {
    const row = await this.prisma.collector.findUnique({
      where: { userId },
      include: { user: true, collectorWards: { include: { ward: true } } },
    });
    if (!row || row.deletedAt || row.status === EntityStatus.INACTIVE) {
      throw new NotFoundException('Collector profile not found');
    }
    return row;
  }

  private serializeProfile(row: Awaited<ReturnType<CollectorsService['requireOwnProfile']>>) {
    return {
      id: row.id,
      display_name: row.displayName,
      contact_phone: row.contactPhone,
      vehicle_type: row.vehicleType,
      max_capacity_l: Number(row.maxCapacityLiters),
      status: row.status,
      last_seen_at: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
      wards: row.collectorWards.map((item) => ({
        id: item.ward.id,
        code: item.ward.code,
        name: item.ward.name,
        district: item.ward.district,
      })),
    };
  }

  private async requireUser(id: string, role: Role): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== role || user.deletedAt) {
      throw new NotFoundException(`User with role ${role} not found`);
    }
  }

  private async requireWards(ids: string[]): Promise<void> {
    const wards = await this.prisma.ward.findMany({ where: { id: { in: ids }, deletedAt: null } });
    if (wards.length !== ids.length) {
      throw new NotFoundException('Ward not found');
    }
  }

  private async getRequired(id: string) {
    const row = await this.prisma.collector.findUnique({ where: { id }, include: { user: true, collectorWards: { include: { ward: true } } } });
    if (!row) {
      throw new NotFoundException('Collector not found');
    }
    return row;
  }

  private serialize(row: Awaited<ReturnType<CollectorsService['getRequired']>>) {
    return {
      id: row.id,
      user_id: row.userId,
      display_name: row.displayName,
      status: row.status,
      is_active: row.isActive,
      last_seen_at: row.lastSeenAt,
      wards: row.collectorWards.map((item) => ({ id: item.ward.id, code: item.ward.code, name: item.ward.name })),
      ward_ids: row.collectorWards.map((item) => item.wardId),
      user: row.user ? { id: row.user.id, name: row.user.name, phone: row.user.phone } : null,
    };
  }
}
