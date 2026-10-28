import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UsersService } from "../users/users.service";
import { TransactionsQueryDto } from "./dto/transactions-query.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ProfileService } from "./profile.service";
import { ChangePasswordDto } from "./dto/account-security.dto";
import { TransactionType } from "../transactions/transaction.entity";

@ApiTags("Profile")
@ApiBearerAuth("JWT-auth")
@Controller("profile")
export class ProfileController {
  constructor(
    private usersService: UsersService,
    private profileService: ProfileService,
  ) {}

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
    @Query() paginationQuery: TransactionsQueryDto,
  ) {
    const type = paginationQuery.type;
    if (type && !Object.values(TransactionType).includes(type))
      throw new BadRequestException("Invalid transaction type");
    return this.usersService.getUserTransactions(
      req.user.id,
      paginationQuery,
      type,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("usage")
  @ApiQuery({ name: "period", required: false, enum: [7, 30, 90] })
  usage(
    @Request() req,
    @Query("period", new DefaultValuePipe(30), ParseIntPipe) period: number,
  ) {
    return this.profileService.usage(req.user.id, period);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("security")
  security(@Request() req) {
    return this.profileService.security(req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("password")
  password(@Request() req, @Body() body: ChangePasswordDto) {
    return this.profileService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("logout-all")
  logoutAll(@Request() req) {
    return this.profileService.revokeSessions(req.user.id);
  }
}
