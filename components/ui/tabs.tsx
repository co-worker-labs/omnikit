"use client";

import { Tab } from "@headlessui/react";
import { ReactNode, Fragment } from "react";

interface TabItem {
  label: ReactNode;
  content: ReactNode;
}

interface NeonTabsProps {
  tabs: TabItem[];
  className?: string;
}

export function NeonTabs({ tabs, className = "" }: NeonTabsProps) {
  return (
    <Tab.Group>
      <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
        <Tab.List className={`flex border-b border-border-default min-w-max ${className}`}>
          {tabs.map((tab, index) => (
            <Tab key={index} as={Fragment}>
              {({ selected }) => (
                <button
                  className={`px-4 py-2.5 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px outline-none whitespace-nowrap ${selected ? "text-accent-cyan border-accent-cyan" : "text-fg-muted border-transparent hover:text-fg-secondary"}`}
                >
                  {tab.label}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>
      </div>
      <Tab.Panels className="mt-4">
        {tabs.map((tab, index) => (
          <Tab.Panel key={index} unmount={false}>
            {tab.content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}
