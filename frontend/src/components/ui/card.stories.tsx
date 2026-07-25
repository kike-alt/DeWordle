import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area. It can contain any type of content.
        </p>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Footer content</p>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Session Result</CardTitle>
        <CardAction>
          <button className="text-sm text-purple-400 hover:text-purple-300">
            Share
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Your game session results appear here.</p>
      </CardContent>
    </Card>
  ),
};

export const Compact: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardContent>
        <p className="text-sm">Simple content-only card.</p>
      </CardContent>
    </Card>
  ),
};
