import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RegionsService, Region } from './regions.service';

@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regions: RegionsService) {}

  @ApiOperation({ summary: 'List Mauritanian regions — top 5 by default, filtered by q' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by Arabic or English name' })
  @Get()
  list(@Query('q') q?: string): Region[] {
    return this.regions.search(q);
  }
}
