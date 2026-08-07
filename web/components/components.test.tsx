import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ToolEvent } from "./ToolEvent";
import { ErrorBanner } from "./ErrorBanner";
import { MessageBubble } from "./MessageBubble";

describe("ToolEvent", () => {
  it("renders a running tool with label", () => {
    const html = renderToStaticMarkup(
      React.createElement(ToolEvent, { tool: { type: "tool", name: "read_dir", status: "start", bytes: 0 } })
    );
    expect(html).toContain("read_dir");
    expect(html).toContain("running");
  });

  it("renders byte count on result", () => {
    const html = renderToStaticMarkup(
      React.createElement(ToolEvent, { tool: { type: "tool", name: "read_dir", status: "result", bytes: 184 } })
    );
    expect(html).toContain("184 bytes");
    expect(html).toContain("done");
  });
});

describe("ErrorBanner", () => {
  it("renders nothing for an empty message", () => {
    expect(renderToStaticMarkup(React.createElement(ErrorBanner, { message: "" }))).toBe("");
  });

  it("renders the message", () => {
    const html = renderToStaticMarkup(React.createElement(ErrorBanner, { message: "boom" }));
    expect(html).toContain("boom");
  });
});

describe("MessageBubble", () => {
  it("renders text content", () => {
    const html = renderToStaticMarkup(React.createElement(MessageBubble, { text: "hi" }));
    expect(html).toContain("hi");
  });
});