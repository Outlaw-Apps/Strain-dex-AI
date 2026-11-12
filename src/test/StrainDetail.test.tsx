import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StrainDetail } from "@/components/StrainDetail";
import type { DbStrain } from "@/hooks/useStrains";

const makeStrain = (overrides: Partial<DbStrain> = {}): DbStrain => ({
  id: "strain-1",
  name: "Insanity OG",
  type: "Hybrid",
  thc: 26,
  cbd: 0.5,
  description: "A potent OG cross.",
  genetics: "Proprietary OG Kush Cross",
  dominant_terpene: "Myrcene",
  effects: ["Relaxing", "Euphoric"],
  negative_effects: ["Dry Mouth"],
  medical_uses: ["Stress", "Pain"],
  aromas: ["Diesel", "Earthy"],
  tastes: ["Sweet"],
  image_url: "",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  deleted_at: null,
  ...overrides,
});

const renderDetail = (strain: DbStrain) => render(<StrainDetail strain={strain} onClose={vi.fn()} />);

describe("StrainDetail trait cards", () => {
  it("renders normalised tiles instead of raw JSON strings", () => {
    renderDetail(
      makeStrain({
        aromas: ['["Diesel Fuel","Earthy Kush","Acrid Pine","Pepper"]'],
        effects: ['["Relaxing","Sleepy","Euphoric"]'],
      }),
    );

    expect(screen.getByText("Diesel Fuel")).toBeInTheDocument();
    expect(screen.getByText("Acrid Pine")).toBeInTheDocument();
    expect(screen.getByText("Sleepy")).toBeInTheDocument();
    expect(screen.queryByText(/\["/)).not.toBeInTheDocument();
  });

  it("renders overflow-safe tiles with clamped, shrinkable labels", () => {
    const longValue = "Supercalifragilisticexpialidocious".repeat(6);
    renderDetail(makeStrain({ effects: [longValue] }));

    const tiles = screen.getAllByTestId("strain-trait-tile");
    const tile = tiles.find((el) => el.textContent?.includes(longValue));
    expect(tile).toBeDefined();
    expect(tile).toHaveClass("min-w-0");
    expect(tile).toHaveAttribute("title", longValue);

    const label = tile!.querySelector("span:last-child");
    expect(label).toHaveClass("line-clamp-2", "break-words", "w-full");
  });

  it("never uses the six-column grid that squeezed the cards", () => {
    const { container } = renderDetail(makeStrain());

    expect(container.innerHTML).not.toContain("xl:grid-cols-6");
    expect(screen.getByTestId("strain-detail-scroll")).toHaveClass("overflow-x-hidden");
  });

  it("keeps every trait section wrapped in a clipping card", () => {
    renderDetail(makeStrain());

    const sections = screen.getAllByRole("region");
    expect(sections.length).toBeGreaterThanOrEqual(5);
    sections.forEach((section) => {
      expect(section).toHaveClass("min-w-0", "overflow-hidden");
    });
  });

  it("shows empty states when list fields are missing", () => {
    renderDetail(
      makeStrain({
        effects: [],
        negative_effects: [],
        aromas: [],
        tastes: [],
        medical_uses: [],
      }),
    );

    expect(screen.getByText("No positive effects listed")).toBeInTheDocument();
    expect(screen.getByText("No negative effects listed")).toBeInTheDocument();
    expect(screen.getByText("No aromas listed")).toBeInTheDocument();
    expect(screen.getByText("No tastes listed")).toBeInTheDocument();
    expect(screen.getByText("No medical uses listed")).toBeInTheDocument();
  });

  it("falls back gracefully for blank text fields and invalid numbers", () => {
    renderDetail(
      makeStrain({
        name: "   ",
        description: "",
        genetics: "   ",
        dominant_terpene: "",
        thc: Number.NaN,
        cbd: Number.POSITIVE_INFINITY,
      }),
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Unnamed strain");
    expect(screen.getAllByText("Lineage unknown").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("No description yet.")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
  });

  it("clamps very long descriptions behind a show more toggle", () => {
    renderDetail(makeStrain({ description: "Dense frosty buds. ".repeat(40) }));

    expect(screen.getByRole("button", { name: "Show more" })).toBeInTheDocument();
  });

  it("clamps long strain names in the header", () => {
    const longName = "Insanity OG ".repeat(20).trim();
    renderDetail(makeStrain({ name: longName }));

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("line-clamp-2", "break-words", "min-w-0");
  });
});
