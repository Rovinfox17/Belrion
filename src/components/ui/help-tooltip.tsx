"use client"

import { CircleHelpIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={text}
            className="inline-flex text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
          />
        }
      >
        <CircleHelpIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
