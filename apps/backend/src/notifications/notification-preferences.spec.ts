import { BadRequestException } from "@nestjs/common";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  assertNotificationPatch,
  mergeNotificationPreferences,
} from "./notification-preferences";
import { describeDevice } from "./device-label";

describe("notification preferences", () => {
  it("falls back to defaults and ignores channels a category does not offer", () => {
    expect(mergeNotificationPreferences(undefined)).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
    const merged = mergeNotificationPreferences({
      categories: {
        support: { push: false, email: false },
        responses: { email: true },
        product: { push: true, email: true },
      },
      sound: false,
    });
    expect(merged.categories.support).toEqual({ push: false, email: false });
    expect(merged.categories.responses.email).toBe(false);
    expect(merged.categories.product).toEqual({ push: false, email: true });
    expect(merged.sound).toBe(false);
  });

  it("rejects unknown categories, channels and values", () => {
    expect(() =>
      assertNotificationPatch({ categories: { billing: { email: true } } }),
    ).not.toThrow();
    for (const bad of [
      null,
      { other: true },
      { sound: "yes" },
      { categories: { unknown: { push: true } } },
      { categories: { billing: { sms: true } } },
      { categories: { billing: { email: "on" } } },
    ])
      expect(() => assertNotificationPatch(bad)).toThrow(BadRequestException);
  });

  it("names the browser and system of a sign-in", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      ),
    ).toBe("Chrome on Windows");
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iOS");
    expect(describeDevice("")).toBe("a browser");
  });
});
