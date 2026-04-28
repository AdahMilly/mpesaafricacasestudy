import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../app/dashboard/page";

// Mock the useRouter hook
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("should redirect to login if no token exists", async () => {
    render(<Dashboard />);

    // Wait for the effect to run
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("should render dashboard when authenticated", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("userEmail", "test@example.com");

    render(<Dashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/welcome back, test/i)).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("should display default welcome message when email not stored", async () => {
    localStorage.setItem("token", "fake-token");
    // Don't set userEmail

    render(<Dashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/welcome back, user/i)).toBeInTheDocument();
  });

  it("should show all stat cards", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("userEmail", "test@example.com");

    render(<Dashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Total Views")).toBeInTheDocument();
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Active Now")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("567")).toBeInTheDocument();
    expect(screen.getByText("$8,901")).toBeInTheDocument();
    expect(screen.getByText("89")).toBeInTheDocument();
  });

  it("should show recent activity section", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("userEmail", "test@example.com");

    render(<Dashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("User interaction #1")).toBeInTheDocument();
    expect(screen.getByText("User interaction #2")).toBeInTheDocument();
    expect(screen.getByText("User interaction #3")).toBeInTheDocument();
    expect(screen.getByText("User interaction #4")).toBeInTheDocument();
  });

  it("should show quick actions section", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("userEmail", "test@example.com");

    render(<Dashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByText("View Settings")).toBeInTheDocument();
    expect(screen.getByText("Help Center")).toBeInTheDocument();
  });

  it("should handle logout", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("userEmail", "test@example.com");

    render(<Dashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await userEvent.click(logoutButton);

    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    expect(localStorage.removeItem).toHaveBeenCalledWith("userEmail");
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
