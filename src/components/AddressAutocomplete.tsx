import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin } from 'lucide-react';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface AddressAutocompleteProps {
  value: string;
  onSelect: (address: string, lat: number, lon: number) => void;
  placeholder?: string;
  required?: boolean;
}

const AddressAutocomplete = ({ value, onSelect, placeholder, required }: AddressAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (inputValue.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&q=${encodeURIComponent(inputValue)}&` +
          `countrycodes=it&addressdetails=1&limit=10`,
          {
            headers: {
              'Accept-Language': 'it'
            }
          }
        );
        const data = await response.json();
        
        // CRITICAL: Filter to only show addresses with house numbers
        const addressesWithNumbers = data.filter((item: any) => {
          // Check if the address contains a number (civico)
          const hasNumber = /\b\d+\b/.test(item.display_name);
          // Also check if it has house_number in address details
          const hasHouseNumber = item.address?.house_number;
          return hasNumber || hasHouseNumber;
        });
        
        setSuggestions(addressesWithNumbers || []);
        setOpen(addressesWithNumbers && addressesWithNumbers.length > 0);
        // Mantieni il focus sull'input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputValue]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    setInputValue(suggestion.display_name);
    onSelect(suggestion.display_name, lat, lon);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <Popover open={open && suggestions.length > 0} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            placeholder={placeholder || "Inserisci indirizzo COMPLETO con numero civico..."}
            required={required}
            className="w-full"
            onFocus={() => {
              if (suggestions.length > 0 && inputValue.length >= 3) {
                setOpen(true);
              }
            }}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>
              {loading ? "Ricerca in corso..." : "Nessun indirizzo trovato con numero civico. Scrivi l'indirizzo completo (es: Via Roma 123, Milano)"}
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.place_id}
                  onSelect={() => handleSelect(suggestion)}
                  className="cursor-pointer"
                >
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{suggestion.display_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AddressAutocomplete;
