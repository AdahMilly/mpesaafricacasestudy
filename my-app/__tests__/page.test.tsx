
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "../app/page";

global.fetch = jest.fn();

describe("Authentication Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Login Form", () => {
    it("should render login form by default", () => {
      render(<Home />);

      expect(screen.getByText("Welcome Back!")).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    });

    it("should show validation errors for empty fields", async () => {
      render(<Home />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(submitButton);

      expect(screen.getByLabelText(/email address/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });

    it("should handle successful login", async () => {
      const mockToken = "fake-jwt-token";
      const mockResponse = { token: mockToken };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<Home />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "password123" },
      });

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `${process.env.NEXT_PUBLIC_API_URL}/Authentication/login`,
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "test@example.com",
              password: "password123",
            }),
          }),
        );
        expect(localStorage.setItem).toHaveBeenCalledWith("token", mockToken);
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "userEmail",
          "test@example.com",
        );
        expect(window.location.href).toBe("/dashboard");
      });
    });

    it("should display error message on login failure", async () => {
      const errorMessage = "Invalid credentials";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      render(<Home />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "wrongpassword" },
      });

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe("Registration Form", () => {
    it("should switch to registration form", () => {
      render(<Home />);

      const signUpButton = screen.getByRole("button", { name: /sign up/i });
      fireEvent.click(signUpButton);

      expect(screen.getByText("Create an Account")).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign up/i }),
      ).toBeInTheDocument();
    });

    it("should handle successful registration", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Registration successful" }),
      });

      render(<Home />);

      // Switch to registration form
      const signUpButton = screen.getByRole("button", { name: /sign up/i });
      fireEvent.click(signUpButton);

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "Test User" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "password123" },
      });

      const submitButton = screen.getByRole("button", { name: /sign up/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `${process.env.NEXT_PUBLIC_API_URL}/Authentication/register`,
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              fullName: "Test User",
              email: "test@example.com",
              password: "password123",
            }),
          }),
        );
        expect(
          screen.getByText(/Account created! Please sign in./i),
        ).toBeInTheDocument();
      });
    });

    it("should display error on registration failure", async () => {
      const errorMessage = "Email already exists";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      render(<Home />);

      const signUpButton = screen.getByRole("button", { name: /sign up/i });
      fireEvent.click(signUpButton);

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "Test User" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "existing@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "password123" },
      });

      const submitButton = screen.getByRole("button", { name: /sign up/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe("Form Toggle", () => {
    it("should toggle between login and registration", () => {
      render(<Home />);

      expect(screen.getByText("Welcome Back!")).toBeInTheDocument();

      const signUpButton = screen.getByRole("button", { name: /sign up/i });
      fireEvent.click(signUpButton);

      expect(screen.getByText("Create an Account")).toBeInTheDocument();

      const signInButton = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(signInButton);

      expect(screen.getByText("Welcome Back!")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show loading state during form submission", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<Home />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "password123" },
      });

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(submitButton);

      expect(screen.getByText("Please wait...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});
