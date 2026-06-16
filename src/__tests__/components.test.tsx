import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeliveryInfo from "@/components/delivery/DeliveryInfo";
import CityList from "@/components/delivery/CityList";
import type { DeliveryResult, City } from "@/types";

describe("DeliveryInfo", () => {
  it("renders available delivery with green indicator", () => {
    const delivery: DeliveryResult = {
      city: "Colombo",
      available: true,
      deliveryDate: "2024-01-05",
      rate: 350,
      currency: "LKR",
    };
    render(<DeliveryInfo delivery={delivery} />);
    expect(screen.getByText("Colombo")).toBeInTheDocument();
    expect(screen.getByText(/Available/i)).toBeInTheDocument();
    expect(screen.getByText(/350/)).toBeInTheDocument();
    expect(screen.getByText(/2024-01-05/)).toBeInTheDocument();
  });

  it("renders unavailable delivery with red indicator", () => {
    const delivery: DeliveryResult = {
      city: "Remote Village",
      available: false,
      deliveryDate: "",
      rate: 0,
      currency: "LKR",
    };
    render(<DeliveryInfo delivery={delivery} />);
    expect(screen.getByText("Remote Village")).toBeInTheDocument();
    expect(screen.getByText(/Not Available/i)).toBeInTheDocument();
  });

  it("renders perishable warning when present", () => {
    const delivery: DeliveryResult = {
      city: "Kandy",
      available: true,
      deliveryDate: "2024-01-06",
      rate: 500,
      currency: "LKR",
      perishableWarning: "Keep refrigerated during transport",
    };
    render(<DeliveryInfo delivery={delivery} />);
    expect(screen.getByText(/Keep refrigerated/)).toBeInTheDocument();
  });
});

describe("CityList", () => {
  const cities: City[] = [
    { name: "Colombo", aliases: ["CMB"] },
    { name: "Kandy" },
    { name: "Galle" },
    { name: "Matara" },
    { name: "Jaffna" },
  ];

  it("renders all cities", () => {
    render(<CityList cities={cities} onSelectCity={vi.fn()} />);
    expect(screen.getByText("Colombo")).toBeInTheDocument();
    expect(screen.getByText("Kandy")).toBeInTheDocument();
    expect(screen.getByText("Galle")).toBeInTheDocument();
    expect(screen.getByText("Matara")).toBeInTheDocument();
    expect(screen.getByText("Jaffna")).toBeInTheDocument();
  });

  it("filters cities based on search input", () => {
    render(<CityList cities={cities} onSelectCity={vi.fn()} />);
    const input = screen.getByPlaceholderText(/filter/i);
    fireEvent.change(input, { target: { value: "kan" } });
    expect(screen.getByText("Kandy")).toBeInTheDocument();
    expect(screen.queryByText("Colombo")).not.toBeInTheDocument();
    expect(screen.queryByText("Galle")).not.toBeInTheDocument();
  });

  it("calls onSelectCity when a city is clicked", () => {
    const onSelectCity = vi.fn();
    render(<CityList cities={cities} onSelectCity={onSelectCity} />);
    fireEvent.click(screen.getByText("Galle"));
    expect(onSelectCity).toHaveBeenCalledWith("Galle");
  });

  it("shows no match message when filter has no results", () => {
    render(<CityList cities={cities} onSelectCity={vi.fn()} />);
    const input = screen.getByPlaceholderText(/filter/i);
    fireEvent.change(input, { target: { value: "xyz" } });
    expect(screen.getByText(/No cities match/i)).toBeInTheDocument();
  });
});
