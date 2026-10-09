import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UsersService } from "../users/users.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Profile")
@ApiBearerAuth("JWT-auth")
@Controller("profile")
export class ProfileController {
  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard("jwt"))
  @ApiOperation({ summary: "Get current authenticated user profile" })
  @Get()
  async getProfile(@Request() req) {
    const userId = req.user.id;
    const user = await this.usersService.findOneById(userId);

    if (!user) {
      return { error: "User not found" };
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      credits: user.credits,
      avatar: user.avatar,
      referralBalance: user.referralBalance || 0,
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("update")
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    await this.usersService.updateUser(req.user.id, updateProfileDto);
    return { status: "success" };
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("affiliate")
  async getAffiliateStats(@Request() req) {
    return this.usersService.getAffiliateStats(req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("transactions")
  async getTransactions(
    @Request() req,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.usersService.getUserTransactions(req.user.id, paginationQuery);
  }
}
