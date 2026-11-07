'use client';

import { format } from '@web/core/i18n/format';
import { Badge } from '@web/ui/badge';
import { Button } from '@web/ui/button';
import { Card } from '@web/ui/card';
import { DatePicker } from '@web/ui/calendar';
import { AreaChart, BarChart } from '@web/ui/chart';
import { Checkbox } from '@web/ui/checkbox';
import { Combobox } from '@web/ui/command';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@web/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/ui/dropdown-menu';
import { Input, Textarea } from '@web/ui/input';
import { Label } from '@web/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@web/ui/popover';
import { Reveal } from '@web/ui/reveal';
import { RichTextEditor } from '@web/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { SortableList } from '@web/ui/sortable-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/ui/tabs';
import { toast } from '@web/ui/toaster';
import { Tooltip, TooltipContent, TooltipTrigger } from '@web/ui/tooltip';
import { ChevronDownIcon, CopyIcon, InfoIcon, PencilIcon, RocketIcon, Trash2Icon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Messages } from '@/i18n/dictionaries';

type T = Messages['designSystem'];

// Sample data for the demos (not product content).
const SERVICES = ['checkout-api', 'billing-worker', 'search-indexer', 'notification-service', 'gateway'].map((name) => ({ value: name, label: name }));
const ENVIRONMENTS = ['development', 'staging', 'production'];
const BY_ENVIRONMENT = [
  { environment: 'development', count: 42 },
  { environment: 'staging', count: 27 },
  { environment: 'production', count: 15 },
];
const BY_WEEK = [6, 9, 7, 12, 10, 15, 13, 18].map((count, i) => ({ week: `W${i + 1}`, count }));

export function DesignSystemShowcase({ t, lang, intlLocale }: { t: T; lang: string; intlLocale: string }) {
  const s = t.samples;
  const [combo, setCombo] = useState<string>();
  const [date, setDate] = useState<Date>();
  const [html, setHtml] = useState('<h2>Release 2.0</h2><p>Faster <strong>checkout</strong> and a new <em>billing</em> worker.</p>');
  const [services, setServices] = useState(SERVICES.map((service) => ({ id: service.value, name: service.label })));

  return (
    <div className="grid gap-6">
      <Block title={t.sections.buttons}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <RocketIcon />
            {s.primary}
          </Button>
          <Button variant="secondary">{s.secondary}</Button>
          <Button variant="ghost">{s.ghost}</Button>
          <Button variant="destructive">
            <Trash2Icon />
            {s.destructive}
          </Button>
          <Button variant="link">{s.link}</Button>
          <Button size="sm">{s.small}</Button>
          <Button size="lg">{s.large}</Button>
          <Button size="icon" variant="secondary" aria-label={s.menuEdit}>
            <PencilIcon />
          </Button>
          <Button disabled>{s.primary}</Button>
        </div>
      </Block>

      <Block title={t.sections.badges}>
        <div className="flex flex-wrap gap-2">
          {(['brand', 'neutral', 'success', 'warning', 'danger', 'info'] as const).map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Block>

      <Block title={t.sections.fields}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="ds-input" label={s.input}>
            <Input id="ds-input" placeholder={s.inputPlaceholder} />
          </Field>
          <Field id="ds-select" label={s.select}>
            <Select>
              <SelectTrigger id="ds-select">
                <SelectValue placeholder={s.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map((environment) => (
                  <SelectItem key={environment} value={environment}>
                    {environment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="ds-combobox" label={s.combobox}>
            <Combobox
              id="ds-combobox"
              options={SERVICES}
              value={combo}
              onChange={setCombo}
              placeholder={s.comboboxPlaceholder}
              searchPlaceholder={s.comboboxSearch}
              emptyText={s.comboboxEmpty}
            />
          </Field>
          <Field id="ds-date" label={s.date}>
            <DatePicker id="ds-date" value={date} onChange={setDate} placeholder={s.datePlaceholder} lang={lang} intlLocale={intlLocale} />
          </Field>
          <Field id="ds-textarea" label={s.textarea} className="md:col-span-2">
            <Textarea id="ds-textarea" placeholder={s.inputPlaceholder} rows={3} />
          </Field>
          <div className="flex items-center gap-2">
            <Checkbox id="ds-checkbox" defaultChecked />
            <Label htmlFor="ds-checkbox">{s.checkbox}</Label>
          </div>
        </div>
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList>
            <TabsTrigger value="overview">{s.tabs.overview}</TabsTrigger>
            <TabsTrigger value="activity">{s.tabs.activity}</TabsTrigger>
            <TabsTrigger value="settings">{s.tabs.settings}</TabsTrigger>
          </TabsList>
          {(['overview', 'activity', 'settings'] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="text-sm text-muted">
              {s.tabs[tab]} — {s.tabsContent}
            </TabsContent>
          ))}
        </Tabs>
      </Block>

      <Block title={t.sections.overlays}>
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">{s.openDialog}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={s.ghost}>
              <DialogHeader>
                <DialogTitle>{s.dialogTitle}</DialogTitle>
                <DialogDescription>{s.dialogText}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{s.secondary}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>{s.confirm}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                {s.menu}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{s.menu}</DropdownMenuLabel>
              <DropdownMenuItem>
                <PencilIcon />
                {s.menuEdit}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CopyIcon />
                {s.menuDuplicate}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>
                <Trash2Icon />
                {s.menuDelete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">{s.popover}</Button>
            </PopoverTrigger>
            <PopoverContent className="text-sm text-muted">{s.popoverText}</PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">
                <InfoIcon />
                {s.tooltip}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{s.tooltipText}</TooltipContent>
          </Tooltip>

          <Button variant="secondary" onClick={() => toast.success(s.toastSuccessText)}>
            {s.toastSuccess}
          </Button>
          <Button variant="secondary" onClick={() => toast.error(s.toastErrorText)}>
            {s.toastError}
          </Button>
        </div>
      </Block>

      <Block title={t.sections.charts}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted">{s.chartBar}</p>
            <BarChart className="mt-3" data={BY_ENVIRONMENT} categoryKey="environment" series={[{ key: 'count', label: s.series }]} label={s.chartBar} height={220} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{s.chartArea}</p>
            <AreaChart className="mt-3" data={BY_WEEK} categoryKey="week" series={[{ key: 'count', label: s.series }]} label={s.chartArea} height={220} />
          </div>
        </div>
      </Block>

      <Block title={t.sections.editor}>
        <RichTextEditor value={html} onChange={setHtml} placeholder={s.editorPlaceholder} labels={t.editor} aria-label={t.sections.editor} />
        <p className="mt-4 text-xs font-medium text-subtle">{s.editorOutput}</p>
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs text-muted">{html}</pre>
      </Block>

      <Block title={t.sections.sortable}>
        <p className="mb-4 text-sm text-muted">{s.sortableHint}</p>
        <SortableList
          className="max-w-md"
          items={services}
          onReorder={setServices}
          getName={(item) => item.name}
          renderItem={(item) => <span className="font-mono text-sm">{item.name}</span>}
          labels={{
            handle: (name) => format(t.sortable.handle, { name }),
            instructions: t.sortable.instructions,
            pickedUp: (name, position) => format(t.sortable.pickedUp, { name, position }),
            movedTo: (name, position) => format(t.sortable.movedTo, { name, position }),
            dropped: (name, position) => format(t.sortable.dropped, { name, position }),
            cancelled: (name) => format(t.sortable.cancelled, { name }),
          }}
        />
      </Block>

      <Reveal>
        <Block title={t.sections.motion}>
          <p className="text-sm text-muted">{s.motionText}</p>
        </Block>
      </Reveal>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-5 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </Card>
  );
}

function Field({ id, label, className, children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`grid gap-2 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
