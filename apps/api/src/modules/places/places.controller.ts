import { Controller, Get, Inject, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { placeDetailsQuerySchema, placesAutocompleteQuerySchema } from '@eco-oil/validation';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlacesService } from './places.service';

@Controller('admin/places')
export class PlacesController {
  constructor(@Inject(PlacesService) private readonly service: PlacesService) {}

  @Roles(Role.ADMIN)
  @Get('autocomplete')
  autocomplete(@Query() query: Record<string, unknown>) {
    const input = placesAutocompleteQuerySchema.parse(query);
    return this.service.autocomplete(input.input, input.session_token);
  }

  @Roles(Role.ADMIN)
  @Get('details')
  details(@Query() query: Record<string, unknown>) {
    const input = placeDetailsQuerySchema.parse(query);
    return this.service.details(input.place_id, input.session_token);
  }
}
