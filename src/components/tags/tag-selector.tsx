"use client";

import { useState, useEffect } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { TagBadge } from "./tag-badge";
import type { TagData } from "@/types";

interface TagSelectorProps {
  selectedTags: TagData[];
  onTagsChange: (tags: TagData[]) => void;
}

export function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setAllTags)
      .catch(() => {});
  }, []);

  const toggleTag = (tag: TagData) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    if (isSelected) {
      onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const createTag = async () => {
    if (!search.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: search.trim() }),
    });
    if (res.ok) {
      const newTag = await res.json();
      setAllTags([...allTags, newTag]);
      onTagsChange([...selectedTags, newTag]);
      setSearch("");
    }
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {selectedTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggleTag(tag)}
          className="inline-flex items-center gap-0.5 group"
        >
          <TagBadge name={tag.name} color={tag.color} />
          <X className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="inline-flex items-center justify-center rounded-md h-6 w-6 hover:bg-accent hover:text-accent-foreground transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <button
                  onClick={createTag}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm w-full hover:bg-accent rounded"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create &quot;{search}&quot;
                </button>
              </CommandEmpty>
              <CommandGroup>
                {allTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => toggleTag(tag)}
                  >
                    <Check
                      className={`mr-2 h-3.5 w-3.5 ${
                        selectedTags.some((t) => t.id === tag.id) ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <TagBadge name={tag.name} color={tag.color} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
