import {
  BadGatewayException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { MapsService } from "./maps.service";
import type { TravelMode } from "./maps.service";

class PointQuery {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng!: number;
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  lang?: string;
}

class RouteQuery {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) fromLat!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) fromLng!: number;
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) toLat!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) toLng!: number;
  @IsIn(["driving", "walking", "cycling"]) mode!: TravelMode;
}

/** What the map cards ask for directly: another travel mode, and where the user is. */
@ApiTags("Chat maps")
@UseGuards(AuthGuard("jwt"))
@Controller("chat/maps")
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get("route")
  async route(@Query() query: RouteQuery) {
    try {
      return await this.maps.route(
        { lat: query.fromLat, lng: query.fromLng },
        { lat: query.toLat, lng: query.toLng },
        query.mode,
      );
    } catch (error: any) {
      throw new BadGatewayException(
        error?.message || "Routing is unavailable right now",
      );
    }
  }

  @Get("where")
  async where(@Query() query: PointQuery) {
    try {
      return await this.maps.reverse(
        { lat: query.lat, lng: query.lng },
        query.lang,
      );
    } catch {
      return { label: "", city: "" };
    }
  }
}
