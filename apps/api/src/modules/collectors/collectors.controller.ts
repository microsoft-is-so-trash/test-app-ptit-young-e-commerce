import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  adminPersonCreateSchema,
  adminPersonPatchSchema,
  collectorNearbyOrdersQuerySchema,
  collectorSelfUpdateSchema,
  entityStatusSchema,
  personListQuerySchema,
} from '@eco-oil/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AccessTokenPayload } from '../auth/auth.types';
import { CollectorsService } from './collectors.service';

@Controller('collectors')
export class CollectorsController {
  constructor(@Inject(CollectorsService) private readonly service: CollectorsService) {}

  @Roles(Role.COLLECTOR)
  @Get('me')
  findMine(@CurrentUser() user: AccessTokenPayload) {
    return this.service.findMine(user);
  }

  @Roles(Role.COLLECTOR)
  @Patch('me')
  updateMine(@CurrentUser() user: AccessTokenPayload, @Body() body: unknown) {
    return this.service.updateMine(user, collectorSelfUpdateSchema.parse(body));
  }

  @Roles(Role.COLLECTOR)
  @Get('me/nearby-orders')
  nearbyOrders(@CurrentUser() user: AccessTokenPayload, @Query() query: Record<string, unknown>) {
    return this.service.nearbyOrders(user, collectorNearbyOrdersQuerySchema.parse(query));
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() body: unknown) {
    return this.service.create(adminPersonCreateSchema.parse(body));
  }

  @Roles(Role.ADMIN)
  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.service.list(personListQuerySchema.parse(query));
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.service.update(id, adminPersonPatchSchema.parse(body));
  }

  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.service.updateStatus(id, entityStatusSchema.parse(body));
  }
}
