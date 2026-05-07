"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  COUNTRIES,
  filterCountries,
  getCountryByCode,
  type Country,
} from "@/lib/countries";
import { cn } from "@/lib/utils";

type CountryComboboxProps = {
  className?: string;
  countries?: readonly Country[];
  disabled?: boolean;
  id?: string;
  name?: string;
  onValueChange: (countryCode: string) => void;
  placeholder?: string;
  value?: string | null;
};

export function CountryCombobox({
  className,
  countries = COUNTRIES,
  disabled = false,
  id,
  name,
  onValueChange,
  placeholder = "Search country...",
  value,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedCountry = useMemo(
    () => getCountryByCode(value, countries),
    [countries, value],
  );
  const filteredCountries = useMemo(
    () => filterCountries(query, countries),
    [countries, query],
  );

  const selectCountry = (countryCode: string) => {
    onValueChange(countryCode);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={selectedCountry?.code ?? ""} />}
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-between", className)}
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedCountry ? (
            <>
              <span aria-hidden="true">{selectedCountry.flag}</span>
              <span className="truncate">{selectedCountry.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {selectedCountry.code}
              </span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,var(--anchor-width))] p-0">
        <Command shouldFilter={false} loop>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filteredCountries.length === 0 ? (
              <CommandEmpty>No country found</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    data-checked={country.code === selectedCountry?.code}
                    onSelect={() => selectCountry(country.code)}
                  >
                    <span aria-hidden="true">{country.flag}</span>
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {country.code}
                    </span>
                    {country.code === selectedCountry?.code && (
                      <Check className="ml-auto size-4" aria-hidden="true" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
