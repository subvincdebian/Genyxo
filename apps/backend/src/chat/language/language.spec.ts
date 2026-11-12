import { countryLanguages, detectTextLanguage } from "./language";
import { countryFromHeaders } from "./language-profile.service";

describe("language detection", () => {
  it.each([
    ["Привіт, як справи? Що нового?", "uk"],
    ["Привет, как дела? Что нового?", "ru"],
    ["Hello, how are you today?", "en"],
    ["Hallo, wie geht es dir? Ich bin müde.", "de"],
    ["Olá, como você está? Não sei.", "pt"],
    ["Cześć, jak się masz? Nie wiem.", "pl"],
    ["こんにちは、元気ですか", "ja"],
  ])("detects %s as %s", (text, code) => {
    expect(detectTextLanguage(text)).toBe(code);
  });

  it("ignores code and stays silent on ambiguous input", () => {
    expect(detectTextLanguage("```js\nconst a = 1;\n```")).toBe("");
    expect(detectTextLanguage("ok")).toBe("");
  });

  it("maps countries and CDN headers", () => {
    expect(countryLanguages("UA")).toEqual(["uk", "ru"]);
    expect(countryFromHeaders({ "cf-ipcountry": "ua" })).toBe("UA");
    expect(countryFromHeaders({ "cf-ipcountry": "XX" })).toBe("");
  });
});
