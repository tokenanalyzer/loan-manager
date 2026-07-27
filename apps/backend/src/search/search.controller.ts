import { Controller, Get, Query } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';

import { SearchResponseDto } from './dto/search-result.dto';
import { SearchService } from './search.service';

/** Global Search — staff-only (customers have no CRM search need). */
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async search(
    @Query('q') q: string | undefined,
    @CurrentAppUser() requester: UserEntity,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(q ?? '', requester);
  }
}
