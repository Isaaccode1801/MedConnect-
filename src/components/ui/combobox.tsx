"use client";

import { Combobox, useListCollection } from "@ark-ui/react/combobox";
import { useFilter } from "@ark-ui/react/locale";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface BasicComboboxProps {
  data?: Array<{ value: string; label: string }>;
  onValueChange?: (value: string) => void;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function BasicCombobox({ 
  data = [],
  onValueChange,
  value,
  placeholder = "Selecione um paciente...",
  disabled = false
}: BasicComboboxProps) {
  const { contains } = useFilter({ sensitivity: "base" });
  const [inputValue, setInputValue] = useState("");
  const [selectedValue, setSelectedValue] = useState<string[]>([]);

  // Extrai apenas os labels para a coleção
  const labels = data.map(item => item.label);

  // Usa o useListCollection para criar a collection correta
  const { collection, filter } = useListCollection({
    initialItems: labels,
    filter: contains,
  });

  // Sincroniza o valor externo com o estado interno
  useEffect(() => {
    if (value) {
      const currentLabel = data.find(item => item.value === value)?.label || "";
      setSelectedValue(currentLabel ? [currentLabel] : []);
    } else {
      setSelectedValue([]);
    }
  }, [value, data]);

  const handleInputChange = (details: any) => {
    setInputValue(details.inputValue);
    filter(details.inputValue);
  };

  const handleValueChange = (details: any) => {
    if (details.value && details.value.length > 0) {
      const selectedLabel = details.value[0];
      const selectedItem = data.find(item => item.label === selectedLabel);
      
      if (selectedItem) {
        setSelectedValue([selectedLabel]);
        onValueChange?.(selectedItem.value);
        setInputValue("");
        filter(""); // Reseta o filtro após seleção
      }
    } else {
      setSelectedValue([]);
      onValueChange?.("");
    }
  };

  return (
    <div className="w-full">
      <Combobox.Root
        collection={collection}
        onInputValueChange={handleInputChange}
        onValueChange={handleValueChange}
        value={selectedValue}
        disabled={disabled}
      >
        <Combobox.Control className="relative">
          <Combobox.Input
            className="theme-combobox-input"
            placeholder={placeholder}
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Combobox.ClearTrigger 
              className="theme-combobox-clear-trigger"
              onClick={() => {
                setInputValue("");
                setSelectedValue([]);
                onValueChange?.("");
                filter("");
              }}
            >
              <XIcon className="h-4 w-4" />
            </Combobox.ClearTrigger>
            <Combobox.Trigger className="theme-combobox-trigger">
              <ChevronDownIcon className="h-4 w-4" />
            </Combobox.Trigger>
          </div>
        </Combobox.Control>
        
        <Combobox.Positioner>
          <Combobox.Content className="theme-combobox-content">
            <Combobox.ItemGroup>
              {collection.items.length === 0 ? (
                <div className="theme-combobox-empty">
                  Nenhum paciente encontrado
                </div>
              ) : (
                data
                  .filter(dataItem => collection.items.includes(dataItem.label))
                  .map((dataItem) => (
                  <Combobox.Item
                    key={dataItem.value}
                    item={dataItem.label}
                    className="theme-combobox-item"
                  >
                    <Combobox.ItemText className="theme-combobox-item-text">
                      {dataItem.label}
                    </Combobox.ItemText>
                    <Combobox.ItemIndicator className="theme-combobox-indicator">
                      ✓
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                ))
              )}
            </Combobox.ItemGroup>
          </Combobox.Content>
        </Combobox.Positioner>
      </Combobox.Root>

      {/* Estilos para modo escuro incluindo scroll */}
      <style>{`
        .theme-combobox-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          padding-right: 5rem;
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          background: var(--color-bg-card);
          color: var(--color-text-primary);
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .theme-combobox-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(63, 187, 192, 0.1);
        }

        .theme-combobox-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .theme-combobox-input::placeholder {
          color: var(--color-text-muted);
        }

        .theme-combobox-clear-trigger,
        .theme-combobox-trigger {
          padding: 0 0.5rem;
          color: var(--color-text-muted);
          transition: color 0.2s ease;
          cursor: pointer;
        }

        .theme-combobox-clear-trigger:hover,
        .theme-combobox-trigger:hover {
          color: var(--color-text-primary);
        }

        .theme-combobox-content {
          margin-top: 0.25rem;
          max-height: 15rem;
          width: 100%;
          overflow: auto;
          border-radius: 0.375rem;
          background: var(--color-bg-card);
          padding: 0.25rem 0;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          z-index: 50;
        }

        /* Estilização da barra de scroll para modo escuro */
        .theme-combobox-content::-webkit-scrollbar {
          width: 8px;
        }

        .theme-combobox-content::-webkit-scrollbar-track {
          background: var(--color-bg-tertiary);
          border-radius: 4px;
        }

        .theme-combobox-content::-webkit-scrollbar-thumb {
          background: var(--color-border-strong);
          border-radius: 4px;
        }

        .theme-combobox-content::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }

        /* Para Firefox */
        .theme-combobox-content {
          scrollbar-width: thin;
          scrollbar-color: var(--color-border-strong) var(--color-bg-tertiary);
        }

        .theme-combobox-empty {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .theme-combobox-item {
          position: relative;
          cursor: pointer;
          user-select: none;
          padding: 0.5rem 0.75rem;
          padding-right: 2.25rem;
          color: var(--color-text-primary);
          transition: background-color 0.2s ease;
        }

        .theme-combobox-item:hover,
        .theme-combobox-item[data-highlighted] {
          background: var(--color-bg-tertiary);
        }

        .theme-combobox-item-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .theme-combobox-indicator {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          display: flex;
          align-items: center;
          padding-right: 0.75rem;
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}