import { IsOptional, IsString, MaxLength } from "class-validator";

export class BillingProfileDto {
  @IsString() @MaxLength(254) invoiceEmail!: string;
  @IsString() @MaxLength(100) fullName!: string;
  @IsString() @MaxLength(2) country!: string;
  @IsString() @MaxLength(120) line1!: string;
  @IsOptional() @IsString() @MaxLength(120) line2?: string;
  @IsString() @MaxLength(80) city!: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;
  @IsOptional() @IsString() @MaxLength(16) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(32) taxId?: string;
}

export class SetupConfirmDto {
  @IsString() @MaxLength(80) setupIntentId!: string;
}
