import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { placeDetailsQuerySchema, placesAutocompleteQuerySchema } from '@eco-oil/validation';
import { PAID_API_RATE_LIMITS, UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlacesService } from './places.service';

@Controller('admin/places')
@UseGuards(UserThrottlerGuard)
export class PlacesController {
  constructor(@Inject(PlacesService) private readonly service: PlacesService) {}

  @Roles(Role.ADMIN)
  @Get('autocomplete')
  @Throttle({ default: PAID_API_RATE_LIMITS.placesAutocomplete })
  autocomplete(@Query() query: Record<string, unknown>) {
    const input = placesAutocompleteQuerySchema.parse(query);
    return this.service.autocomplete(input.input, input.session_token);
  }

  @Roles(Role.ADMIN)
  @Get('details')
  @Throttle({ default: PAID_API_RATE_LIMITS.placesDetails })
  details(@Query() query: Record<string, unknown>) {
    const input = placeDetailsQuerySchema.parse(query);
    return this.service.details(input.place_id, input.session_token);
  }
}
