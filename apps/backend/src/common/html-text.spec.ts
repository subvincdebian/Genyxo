import { decodeEntities, htmlToText } from "./html-text";

describe("htmlToText", () => {
  it("keeps text and line breaks and drops scripts and styles", () => {
    expect(
      htmlToText(
        "<p>Hello<br>world</p><script>alert(1)</script><style>p{}</style>Bye",
      ),
    ).toBe("Hello\nworld\n\nBye");
  });

  it("leaves no tag behind when fragments would reassemble", () => {
    const text = htmlToText("a<scr<script>ipt>b</script>c<scri");
    expect(text).not.toMatch(/<\s*script/i);
    expect(text).not.toContain("<scri");
  });

  it("decodes entities once", () => {
    expect(decodeEntities("&amp;lt;b&amp;gt; &#39;x&#x27; &nbsp;")).toBe(
      "&lt;b&gt; 'x'  ",
    );
    expect(htmlToText("<b>a &lt; b</b>")).toBe("a < b");
  });
});
