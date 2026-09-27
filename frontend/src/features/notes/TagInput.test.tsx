// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { TagInput } from "@/features/notes/TagInput";

function Harness({ initial = [], max, error, onDraftChange }: { initial?: string[]; max?: number; error?: string; onDraftChange?: (d: string) => void }) {
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <>
      <TagInput id="tags" label="Tags" value={tags} onChange={setTags} max={max} error={error} onDraftChange={onDraftChange} />
      <output data-testid="value">{JSON.stringify(tags)}</output>
    </>
  );
}

const input = () => screen.getByLabelText("Tags") as HTMLInputElement;
const value = () => JSON.parse(screen.getByTestId("value").textContent ?? "[]") as string[];
const chips = () => screen.queryAllByTestId("tag-chip").map((c) => c.textContent?.replace("×", ""));

afterEach(cleanup);

describe("TagInput", () => {
  it("adds a normalized chip on Enter and clears the draft", () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: "  Kotlin " } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(value()).toEqual(["kotlin"]);
    expect(chips()).toEqual(["kotlin"]);
    expect(input().value).toBe("");
  });

  it("adds on comma and on blur, ignoring duplicates after normalization", () => {
    render(<Harness initial={["kotlin"]} />);
    fireEvent.change(input(), { target: { value: "Setup" } });
    fireEvent.keyDown(input(), { key: "," });
    fireEvent.change(input(), { target: { value: "KOTLIN" } });
    fireEvent.blur(input());
    expect(value()).toEqual(["kotlin", "setup"]);
    expect(input().value).toBe("");
  });

  it("rejects an invalid draft with an inline error and keeps the draft", () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: "bad tag!" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(value()).toEqual([]);
    expect(screen.getByRole("alert").textContent).toMatch(/lowercase letters/);
    expect(input().value).toBe("bad tag!");
    expect(input().getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(input(), { target: { value: "bad-tag" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reports the uncommitted draft via onDraftChange (rejected draft stays pending, committed draft clears)", () => {
    const onDraftChange = vi.fn();
    render(<Harness onDraftChange={onDraftChange} />);
    fireEvent.change(input(), { target: { value: "bad tag!" } });
    fireEvent.blur(input());
    expect(onDraftChange).toHaveBeenLastCalledWith("bad tag!");
    fireEvent.change(input(), { target: { value: "kotlin" } });
    fireEvent.blur(input());
    expect(onDraftChange).toHaveBeenLastCalledWith("");
    expect(value()).toEqual(["kotlin"]);
  });

  it("refuses the 11th tag with a max message", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `t${i}`);
    render(<Harness initial={ten} />);
    fireEvent.change(input(), { target: { value: "eleven" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(value()).toEqual(ten);
    expect(screen.getByRole("alert").textContent).toMatch(/At most 10 tags/);
  });

  it("removes chips via the × button and via Backspace on an empty draft", () => {
    render(<Harness initial={["kotlin", "setup", "docs"]} />);
    fireEvent.click(screen.getByLabelText("Remove tag setup"));
    expect(value()).toEqual(["kotlin", "docs"]);
    fireEvent.keyDown(input(), { key: "Backspace" });
    expect(value()).toEqual(["kotlin"]);
    fireEvent.change(input(), { target: { value: "x" } });
    fireEvent.keyDown(input(), { key: "Backspace" });
    expect(value()).toEqual(["kotlin"]);
  });

  it("shows a field-level error passed from the form (e.g. backend VALIDATION_FAILED)", () => {
    render(<Harness error="tags must not exceed 10" />);
    expect(screen.getByRole("alert").textContent).toBe("tags must not exceed 10");
  });

  it("calls onChange with a fresh array (does not mutate the prop)", () => {
    const initial = ["a"];
    const onChange = vi.fn();
    render(<TagInput id="tags" label="Tags" value={initial} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: "b" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
    expect(initial).toEqual(["a"]);
  });
});
