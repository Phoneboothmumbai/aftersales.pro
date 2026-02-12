import React from "react";
import { useTranslation } from "react-i18next";
import { languages, getLanguageDirection } from "../i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Globe, Check } from "lucide-react";

export const LanguageSelector = ({ variant = "default", showLabel = false }) => {
  const { i18n } = useTranslation();
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    // Update document direction for RTL languages
    document.documentElement.dir = getLanguageDirection(langCode);
    // Persist in localStorage (already handled by i18next-browser-languagedetector)
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "ghost" ? "ghost" : "outline"}
          size={showLabel ? "default" : "icon"}
          className="gap-2"
          data-testid="language-selector-btn"
        >
          <Globe className="w-4 h-4" />
          {showLabel && (
            <span className="hidden sm:inline">{currentLang.nativeName}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer"
            data-testid={`lang-option-${lang.code}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{lang.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
            </div>
            {i18n.language === lang.code && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
