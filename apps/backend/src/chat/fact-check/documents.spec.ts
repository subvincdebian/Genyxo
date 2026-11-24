import { documentEvidence, documentsFrom, terms } from "./documents";

const contract = {
  name: "Supply agreement.pdf",
  mime_type: "application/pdf",
  extracted_text:
    "1. Parties. This agreement is made between Northwind Ltd and Contoso GmbH. " +
    "7. Termination. Either party may terminate this agreement with 60 days written notice. " +
    "9. Payment. Invoices are payable within 30 days of receipt. Late payments accrue 1.5% interest per month.",
};

describe("fact-check documents", () => {
  it("keeps numbers as search terms", () => {
    expect(terms("Terminate with 60 days notice")).toEqual([
      "terminate",
      "with",
      "60",
      "days",
      "notice",
    ]);
  });

  it("collects readable files once, chat files before project files", () => {
    const docs = documentsFrom(
      [contract, { name: "photo.png", mime_type: "image/png" }, contract],
      [
        {
          name: "Policy.docx",
          mime_type: "application/msword",
          extracted_text: "Staff must...",
        },
      ],
    );
    expect(docs.map((doc) => [doc.name, doc.origin])).toEqual([
      ["Supply agreement.pdf", "chat"],
      ["Policy.docx", "project"],
    ]);
  });

  it("finds the clause that settles a claim", () => {
    const [passage] = documentEvidence(
      documentsFrom([contract]),
      "Either party can terminate with 30 days notice",
    );
    expect(passage.name).toBe("Supply agreement.pdf");
    expect(passage.text).toContain("60 days written notice");
  });

  it("returns nothing when the documents do not cover the claim", () => {
    expect(
      documentEvidence(
        documentsFrom([contract]),
        "The Eiffel Tower is in Paris",
      ),
    ).toEqual([]);
  });
});
