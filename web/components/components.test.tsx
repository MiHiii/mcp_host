import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ToolEvent } from "./ToolEvent";
import { ErrorBanner } from "./ErrorBanner";
import { MessageBubble } from "./MessageBubble";
import { MarkdownRenderer } from "./MarkdownRenderer";

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
  it("renders text content for default assistant role", () => {
    const html = renderToStaticMarkup(React.createElement(MessageBubble, { text: "hi" }));
    expect(html).toContain("hi");
    expect(html).toContain("MCP Agent");
  });

  it("renders user message bubble for user role", () => {
    const html = renderToStaticMarkup(React.createElement(MessageBubble, { text: "Hello agent", role: "user" }));
    expect(html).toContain("Hello agent");
    expect(html).toContain("You");
  });
});

describe("MarkdownRenderer", () => {
  it("renders headers and lists cleanly", () => {
    const markdown = "### Title\n* item 1\n* item 2";
    const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdown }));
    expect(html).toContain("Title");
    expect(html).toContain("item 1");
    expect(html).toContain("item 2");
  });
});