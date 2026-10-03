import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { entityStatusSchema, personListQuerySchema, stationCreateSchema, stationPatchSchema, stationRecommendSchema } from '@eco-oil/validation';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoadDistanceService } from './road-distance';
import { StationsService } from './stations.service';

@Controller('stations')
export class StationsController {
  constructor(
    @Inject(StationsService) private readonly service: StationsService,
    @Inject(RoadDistanceService) private readonly roadDistance: RoadDistanceService,
  ) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() body: unknown) {
    return this.service.create(stationCreateSchema.parse(body));
  }

  @Roles(Role.ADMIN)
  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.service.list(personListQuerySchema.parse(query));
  }

  @Roles(Role.COLLECTOR, Role.ADMIN)
  @Get('recommend')
  async recommend(@Query() query: Record<string, unknown>) {
    const input = stationRecommendSchema.parse(query);
    // Đường chim bay từ PostGIS, rồi xếp lại các trạm gần nhất theo quãng đường nếu được (I1.2).
    return this.roadDistance.enrich({ lat: input.lat, lng: input.lng }, await this.service.recommend(input));
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.service.update(id, stationPatchSchema.parse(body));
  }

  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.service.updateStatus(id, entityStatusSchema.parse(body));
  }
}
