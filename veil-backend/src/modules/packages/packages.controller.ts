import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PackagesService } from './packages.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { QueryPackageDto } from './dto/query-package.dto.js';
import { AdminQueryPackageDto } from './dto/admin-query-package.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new perfume gift package (Admin)' })
  create(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active gift packages for storefront' })
  findAllPublic(@Query() query: QueryPackageDto) {
    return this.packagesService.findAll({ ...query, isActive: true });
  }

  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all packages with admin filters (Admin)' })
  findAllAdmin(@Query() query: AdminQueryPackageDto) {
    return this.packagesService.findAll(query);
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get single package details by UUID or slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.packagesService.findOne(idOrSlug);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update gift package (Admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.packagesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete gift package (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.remove(id);
  }
}
