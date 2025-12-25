import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Area } from 'recharts';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { Bar } from 'recharts';
import { CartesianGrid } from 'recharts';
import { Cell } from 'recharts';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { ClassProp } from 'class-variance-authority/types';
import { ClassValue } from 'clsx';
import { DayPicker } from 'react-day-picker';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { editor } from 'monaco-editor';
import { JSX } from 'react/jsx-runtime';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Legend } from 'recharts';
import { Line } from 'recharts';
import { Pie } from 'recharts';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as React_2 from 'react';
import { AreaChart as RechartsAreaChart } from 'recharts';
import { BarChart as RechartsBarChart } from 'recharts';
import { LineChart as RechartsLineChart } from 'recharts';
import { PieChart as RechartsPieChart } from 'recharts';
import { Tooltip as RechartsTooltip } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as ToastPrimitives from '@radix-ui/react-toast';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { VariantProps } from 'class-variance-authority';
import { XAxis } from 'recharts';
import { YAxis } from 'recharts';

export declare const ActionMenu: React_2.ForwardRefExoticComponent<ActionMenuProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface ActionMenuItem {
    label: string;
    icon?: React_2.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    destructive?: boolean;
    separator?: boolean;
}

export declare interface ActionMenuProps {
    items: ActionMenuItem[];
    trigger?: React_2.ReactNode;
    align?: "start" | "center" | "end";
    className?: string;
}

export declare interface ActiveFilter {
    field: string;
    fieldLabel: string;
    operator?: string;
    value: string;
    valueLabel?: string;
}

export declare const AddFilterButton: React_2.ForwardRefExoticComponent<AddFilterButtonProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface AddFilterButtonProps {
    options: FilterOption[];
    onSelect: (option: FilterOption) => void;
    label?: string;
    className?: string;
}

export declare const Alert: React_2.ForwardRefExoticComponent<AlertProps & React_2.RefAttributes<HTMLDivElement>>;

export declare const AlertDescription: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLParagraphElement> & React_2.RefAttributes<HTMLParagraphElement>>;

export declare const AlertDialog: React_2.FC<AlertDialogPrimitive.AlertDialogProps>;

export declare const AlertDialogAction: React_2.ForwardRefExoticComponent<Omit<AlertDialogPrimitive.AlertDialogActionProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare const AlertDialogCancel: React_2.ForwardRefExoticComponent<Omit<AlertDialogPrimitive.AlertDialogCancelProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare const AlertDialogContent: React_2.ForwardRefExoticComponent<Omit<AlertDialogPrimitive.AlertDialogContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const AlertDialogDescription: React_2.ForwardRefExoticComponent<Omit<AlertDialogPrimitive.AlertDialogDescriptionProps & React_2.RefAttributes<HTMLParagraphElement>, "ref"> & React_2.RefAttributes<HTMLParagraphElement>>;

export declare const AlertDialogFooter: {
    ({ className, ...props }: React_2.HTMLAttributes<HTMLDivElement>): JSX.Element;
    displayName: string;
};

export declare const AlertDialogHeader: {
    ({ className, ...props }: React_2.HTMLAttributes<HTMLDivElement>): JSX.Element;
    displayName: string;
};

export declare const AlertDialogOverlay: React_2.ForwardRefExoticComponent<Omit<AlertDialogPrimitive.AlertDialogOverlayProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const AlertDialogPortal: React_2.FC<AlertDialogPrimitive.AlertDialogPortalProps>;

export declare const AlertDialogTitle: React_2.ForwardRefExoticComponent<Omit<AlertDialogPrimitive.AlertDialogTitleProps & React_2.RefAttributes<HTMLHeadingElement>, "ref"> & React_2.RefAttributes<HTMLHeadingElement>>;

export declare const AlertDialogTrigger: React_2.ForwardRefExoticComponent<AlertDialogPrimitive.AlertDialogTriggerProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface AlertProps extends React_2.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "info" | "success" | "warning" | "destructive" | null;
    /** Icon to display. If not provided, uses the default icon for the variant */
    icon?: React_2.ReactNode;
    /** Whether to show the default icon for the variant */
    showIcon?: boolean;
    /** Whether the alert can be dismissed */
    dismissible?: boolean;
    /** Callback when the alert is dismissed */
    onDismiss?: () => void;
}

export declare const AlertTitle: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLHeadingElement> & React_2.RefAttributes<HTMLParagraphElement>>;

export declare const alertVariants: (props?: ({
    variant?: "default" | "destructive" | "success" | "warning" | "info" | null | undefined;
} & ClassProp) | undefined) => string;

export { Area }

export declare const AreaChart: React_2.ForwardRefExoticComponent<AreaChartProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface AreaChartDataPoint {
    [key: string]: string | number;
}

export declare interface AreaChartProps extends React_2.HTMLAttributes<HTMLDivElement> {
    data: AreaChartDataPoint[];
    areas: AreaConfig[];
    xAxisKey: string;
    height?: number;
    title?: string;
    description?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    xAxisFormatter?: (value: string) => string;
    yAxisFormatter?: (value: number) => string;
    tooltipFormatter?: (value: number, name: string) => string;
    loading?: boolean;
    stacked?: boolean;
}

export declare interface AreaConfig {
    dataKey: string;
    name?: string;
    color?: string;
    fillOpacity?: number;
    strokeWidth?: number;
    type?: "linear" | "monotone" | "step" | "stepBefore" | "stepAfter";
    stacked?: boolean;
}

export declare const Avatar: React_2.ForwardRefExoticComponent<Omit<AvatarPrimitive.AvatarProps & React_2.RefAttributes<HTMLSpanElement>, "ref"> & React_2.RefAttributes<HTMLSpanElement>>;

export declare const AvatarFallback: React_2.ForwardRefExoticComponent<Omit<AvatarPrimitive.AvatarFallbackProps & React_2.RefAttributes<HTMLSpanElement>, "ref"> & React_2.RefAttributes<HTMLSpanElement>>;

export declare const AvatarImage: React_2.ForwardRefExoticComponent<Omit<AvatarPrimitive.AvatarImageProps & React_2.RefAttributes<HTMLImageElement>, "ref"> & React_2.RefAttributes<HTMLImageElement>>;

export declare function Badge({ className, variant, ...props }: BadgeProps): JSX.Element;

export declare interface BadgeProps extends React_2.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | null;
}

export declare const badgeVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "info" | null | undefined;
} & ClassProp) | undefined) => string;

export { Bar }

export declare const BarChart: React_2.ForwardRefExoticComponent<BarChartProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface BarChartDataPoint {
    [key: string]: string | number;
}

export declare interface BarChartProps extends React_2.HTMLAttributes<HTMLDivElement> {
    data: BarChartDataPoint[];
    bars: BarConfig[];
    xAxisKey: string;
    height?: number;
    title?: string;
    description?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    xAxisFormatter?: (value: string) => string;
    yAxisFormatter?: (value: number) => string;
    tooltipFormatter?: (value: number, name: string) => string;
    loading?: boolean;
    layout?: "horizontal" | "vertical";
    stacked?: boolean;
}

export declare interface BarConfig {
    dataKey: string;
    name?: string;
    color?: string;
    stacked?: boolean;
    radius?: number;
}

export declare const BenchmarkChart: React_2.ForwardRefExoticComponent<BenchmarkChartProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface BenchmarkChartProps extends React_2.HTMLAttributes<HTMLDivElement> {
    items: BenchmarkItem[];
    maxValue?: number;
    orientation?: "horizontal" | "vertical";
    formatValue?: (value: number) => string;
    unit?: string;
    lowerIsBetter?: boolean;
}

export declare interface BenchmarkItem {
    label: string;
    value: number;
    highlight?: boolean;
}

export declare const Breadcrumb: React_2.ForwardRefExoticComponent<BreadcrumbProps & React_2.RefAttributes<HTMLElement>>;

export declare interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: React_2.ReactNode;
    onClick?: () => void;
}

export declare interface BreadcrumbProps extends React_2.HTMLAttributes<HTMLElement> {
    items: BreadcrumbItem[];
    separator?: React_2.ReactNode;
    showHomeIcon?: boolean;
    maxItems?: number;
}

export declare const Button: React_2.ForwardRefExoticComponent<ButtonProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface ButtonProps extends React_2.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null;
    size?: "default" | "sm" | "lg" | "icon" | null;
}

export declare const buttonVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
} & ClassProp) | undefined) => string;

export declare function Calendar({ className, classNames, showOutsideDays, ...props }: CalendarProps): JSX.Element;

export declare namespace Calendar {
    var displayName: string;
}

export declare type CalendarProps = React_2.ComponentProps<typeof DayPicker>;

export declare const Callout: React_2.ForwardRefExoticComponent<CalloutProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface CalloutProps extends React_2.HTMLAttributes<HTMLDivElement> {
    variant?: CalloutVariant;
    title?: string;
    children: React_2.ReactNode;
}

export declare type CalloutVariant = "info" | "warning" | "error" | "success";

export declare const Card: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLDivElement> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CardContent: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLDivElement> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CardDescription: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLParagraphElement> & React_2.RefAttributes<HTMLParagraphElement>>;

export declare const CardFooter: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLDivElement> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CardHeader: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLDivElement> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CardTitle: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLHeadingElement> & React_2.RefAttributes<HTMLParagraphElement>>;

export { CartesianGrid }

export { Cell }

export declare const ChartContainer: React_2.ForwardRefExoticComponent<ChartContainerProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface ChartContainerProps extends React_2.HTMLAttributes<HTMLDivElement> {
    title?: string;
    description?: string;
    height?: number;
    loading?: boolean;
    empty?: boolean;
    emptyMessage?: string;
}

export declare const ChartTooltip: React_2.FC<ChartTooltipProps>;

export declare interface ChartTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        dataKey: string;
    }>;
    label?: string;
    formatter?: (value: number, name: string) => string;
    labelFormatter?: (label: string) => string;
    className?: string;
}

export declare const Checkbox: React_2.ForwardRefExoticComponent<Omit<CheckboxPrimitive.CheckboxProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare const CircularProgress: React_2.ForwardRefExoticComponent<CircularProgressProps & React_2.RefAttributes<SVGSVGElement>>;

export declare interface CircularProgressProps extends React_2.SVGAttributes<SVGSVGElement> {
    value: number;
    size?: number;
    strokeWidth?: number;
    showValue?: boolean;
    label?: string;
}

/**
 * Merge Tailwind CSS classes with proper conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 *
 * @example
 * cn("px-2 py-1", "px-4") // => "py-1 px-4"
 * cn("text-red-500", condition && "text-blue-500") // conditional classes
 */
export declare function cn(...inputs: ClassValue[]): string;

export declare interface CodeTab {
    label: string;
    language?: string;
    code: string;
}

export declare const CodeTabs: React_2.ForwardRefExoticComponent<CodeTabsProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface CodeTabsProps extends React_2.HTMLAttributes<HTMLDivElement> {
    tabs: CodeTab[];
    defaultTab?: string;
}

export declare const CollapsibleSection: React_2.ForwardRefExoticComponent<CollapsibleSectionProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface CollapsibleSectionProps extends React_2.HTMLAttributes<HTMLDivElement> {
    title: string;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React_2.ReactNode;
}

export declare interface Column<T> {
    key: keyof T | string;
    header: string;
    width?: string | number;
    align?: "left" | "center" | "right";
    sortable?: boolean;
    render?: (value: unknown, row: T, index: number) => React_2.ReactNode;
}

export declare const Combobox: React_2.ForwardRefExoticComponent<ComboboxProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface ComboboxOption {
    value: string;
    label: string;
    disabled?: boolean;
    icon?: React_2.ReactNode;
    description?: string;
}

export declare interface ComboboxProps {
    /** Available options */
    options: ComboboxOption[];
    /** Currently selected value(s) */
    value?: string | string[];
    /** Callback when selection changes */
    onValueChange?: (value: string | string[]) => void;
    /** Placeholder text when no selection */
    placeholder?: string;
    /** Search input placeholder */
    searchPlaceholder?: string;
    /** Text shown when no results found */
    emptyText?: string;
    /** Whether multiple selections are allowed */
    multiple?: boolean;
    /** Whether the combobox is disabled */
    disabled?: boolean;
    /** Additional className for the trigger button */
    className?: string;
    /** Width of the popover content */
    popoverWidth?: string | number;
    /** Whether to allow clearing the selection */
    clearable?: boolean;
    /** Custom filter function */
    filterFn?: (option: ComboboxOption, search: string) => boolean;
}

export declare const Command: React_2.ForwardRefExoticComponent<Omit<{
    children?: React_2.ReactNode;
} & Pick<Pick<React_2.DetailedHTMLProps<React_2.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    ref?: React_2.Ref<HTMLDivElement>;
} & {
    asChild?: boolean;
}, "asChild" | "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    label?: string;
    shouldFilter?: boolean;
    filter?: (value: string, search: string, keywords?: string[]) => number;
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    loop?: boolean;
    disablePointerSelection?: boolean;
    vimBindings?: boolean;
} & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CommandEmpty: React_2.ForwardRefExoticComponent<Omit<{
    children?: React_2.ReactNode;
} & Pick<Pick<React_2.DetailedHTMLProps<React_2.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    ref?: React_2.Ref<HTMLDivElement>;
} & {
    asChild?: boolean;
}, "asChild" | "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CommandGroup: React_2.ForwardRefExoticComponent<Omit<{
    children?: React_2.ReactNode;
} & Omit<Pick<Pick<React_2.DetailedHTMLProps<React_2.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    ref?: React_2.Ref<HTMLDivElement>;
} & {
    asChild?: boolean;
}, "asChild" | "key" | keyof React_2.HTMLAttributes<HTMLDivElement>>, "value" | "heading"> & {
    heading?: React_2.ReactNode;
    value?: string;
    forceMount?: boolean;
} & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CommandInput: React_2.ForwardRefExoticComponent<Omit<Omit<Pick<Pick<React_2.DetailedHTMLProps<React_2.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "key" | keyof React_2.InputHTMLAttributes<HTMLInputElement>> & {
    ref?: React_2.Ref<HTMLInputElement>;
} & {
    asChild?: boolean;
}, "asChild" | "key" | keyof React_2.InputHTMLAttributes<HTMLInputElement>>, "type" | "value" | "onChange"> & {
    value?: string;
    onValueChange?: (search: string) => void;
} & React_2.RefAttributes<HTMLInputElement>, "ref"> & React_2.RefAttributes<HTMLInputElement>>;

export declare const CommandItem: React_2.ForwardRefExoticComponent<Omit<{
    children?: React_2.ReactNode;
} & Omit<Pick<Pick<React_2.DetailedHTMLProps<React_2.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    ref?: React_2.Ref<HTMLDivElement>;
} & {
    asChild?: boolean;
}, "asChild" | "key" | keyof React_2.HTMLAttributes<HTMLDivElement>>, "disabled" | "value" | "onSelect"> & {
    disabled?: boolean;
    onSelect?: (value: string) => void;
    value?: string;
    keywords?: string[];
    forceMount?: boolean;
} & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CommandList: React_2.ForwardRefExoticComponent<Omit<{
    children?: React_2.ReactNode;
} & Pick<Pick<React_2.DetailedHTMLProps<React_2.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    ref?: React_2.Ref<HTMLDivElement>;
} & {
    asChild?: boolean;
}, "asChild" | "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    label?: string;
} & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CommandPalette: React_2.ForwardRefExoticComponent<CommandPaletteProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface CommandPaletteProps {
    /** Whether the command palette is open */
    open?: boolean;
    /** Callback when open state changes */
    onOpenChange?: (open: boolean) => void;
    /** Placeholder text for the search input */
    placeholder?: string;
    /** Text shown when no results found */
    emptyText?: string;
    /** Children (CommandGroup, CommandItem, etc.) */
    children?: React_2.ReactNode;
    /** Whether to show the close button */
    showCloseButton?: boolean;
    /** Additional className for the dialog content */
    className?: string;
}

export declare const CommandSeparator: React_2.ForwardRefExoticComponent<Omit<Pick<Pick<React_2.DetailedHTMLProps<React_2.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    ref?: React_2.Ref<HTMLDivElement>;
} & {
    asChild?: boolean;
}, "asChild" | "key" | keyof React_2.HTMLAttributes<HTMLDivElement>> & {
    alwaysRender?: boolean;
} & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const CommandShortcut: {
    ({ className, ...props }: React_2.HTMLAttributes<HTMLSpanElement>): JSX.Element;
    displayName: string;
};

export declare function ConnectionBanner({ isDisconnected, message, onDismiss, className, }: ConnectionBannerProps): JSX.Element | null;

export declare interface ConnectionBannerProps {
    /** Whether the connection is disconnected */
    isDisconnected: boolean;
    /** Message to display when disconnected */
    message?: string;
    /** Callback when dismissed */
    onDismiss?: () => void;
    /** Custom class */
    className?: string;
}

export declare const DataTable: <T extends Record<string, unknown>>(props: DataTableProps<T> & {
    ref?: React_2.ForwardedRef<HTMLDivElement>;
}) => React_2.ReactElement;

export declare interface DataTableProps<T> extends React_2.HTMLAttributes<HTMLDivElement> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    emptyMessage?: string;
    striped?: boolean;
    hoverable?: boolean;
    compact?: boolean;
    stickyHeader?: boolean;
    onRowClick?: (row: T, index: number) => void;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    onSort?: (column: string) => void;
}

export declare interface DateRange {
    from: Date | undefined;
    to?: Date | undefined;
}

export declare const DateRangePicker: React_2.ForwardRefExoticComponent<DateRangePickerProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface DateRangePickerProps {
    value?: DateRange;
    onChange?: (range: DateRange | undefined) => void;
    presets?: DateRangePreset[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    showPresets?: boolean;
}

export declare interface DateRangePreset {
    label: string;
    value: string;
    getRange: () => DateRange;
}

export declare const defaultPresets: DateRangePreset[];

export declare interface DefinitionItem {
    term: string;
    description: React_2.ReactNode;
    icon?: React_2.ReactNode;
}

export declare const DefinitionList: React_2.ForwardRefExoticComponent<DefinitionListProps & React_2.RefAttributes<HTMLDListElement>>;

export declare interface DefinitionListProps extends React_2.HTMLAttributes<HTMLDListElement> {
    items: DefinitionItem[];
    layout?: "horizontal" | "vertical" | "grid";
    columns?: 1 | 2 | 3 | 4;
    striped?: boolean;
    bordered?: boolean;
}

export declare const Dialog: React_2.FC<DialogPrimitive.DialogProps>;

export declare const DialogClose: React_2.ForwardRefExoticComponent<DialogPrimitive.DialogCloseProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare const DialogContent: React_2.ForwardRefExoticComponent<Omit<DialogPrimitive.DialogContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const DialogDescription: React_2.ForwardRefExoticComponent<Omit<DialogPrimitive.DialogDescriptionProps & React_2.RefAttributes<HTMLParagraphElement>, "ref"> & React_2.RefAttributes<HTMLParagraphElement>>;

export declare const DialogFooter: {
    ({ className, ...props }: React_2.HTMLAttributes<HTMLDivElement>): JSX.Element;
    displayName: string;
};

export declare const DialogHeader: {
    ({ className, ...props }: React_2.HTMLAttributes<HTMLDivElement>): JSX.Element;
    displayName: string;
};

export declare const DialogOverlay: React_2.ForwardRefExoticComponent<Omit<DialogPrimitive.DialogOverlayProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const DialogPortal: React_2.FC<DialogPrimitive.DialogPortalProps>;

export declare const DialogTitle: React_2.ForwardRefExoticComponent<Omit<DialogPrimitive.DialogTitleProps & React_2.RefAttributes<HTMLHeadingElement>, "ref"> & React_2.RefAttributes<HTMLHeadingElement>>;

export declare const DialogTrigger: React_2.ForwardRefExoticComponent<DialogPrimitive.DialogTriggerProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare const DropdownMenu: React_2.FC<DropdownMenuPrimitive.DropdownMenuProps>;

export declare const DropdownMenuCheckboxItem: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuCheckboxItemProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuContent: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuGroup: React_2.ForwardRefExoticComponent<DropdownMenuPrimitive.DropdownMenuGroupProps & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuItem: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuItemProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & {
    inset?: boolean;
} & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuLabel: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuLabelProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & {
    inset?: boolean;
} & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuPortal: React_2.FC<DropdownMenuPrimitive.DropdownMenuPortalProps>;

export declare const DropdownMenuRadioGroup: React_2.ForwardRefExoticComponent<DropdownMenuPrimitive.DropdownMenuRadioGroupProps & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuRadioItem: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuRadioItemProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuSeparator: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuSeparatorProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuShortcut: {
    ({ className, ...props }: React_2.HTMLAttributes<HTMLSpanElement>): JSX.Element;
    displayName: string;
};

export declare const DropdownMenuSub: React_2.FC<DropdownMenuPrimitive.DropdownMenuSubProps>;

export declare const DropdownMenuSubContent: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuSubContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuSubTrigger: React_2.ForwardRefExoticComponent<Omit<DropdownMenuPrimitive.DropdownMenuSubTriggerProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & {
    inset?: boolean;
} & React_2.RefAttributes<HTMLDivElement>>;

export declare const DropdownMenuTrigger: React_2.ForwardRefExoticComponent<DropdownMenuPrimitive.DropdownMenuTriggerProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare const EmptyState: React_2.ForwardRefExoticComponent<EmptyStateProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface EmptyStateProps extends React_2.HTMLAttributes<HTMLDivElement> {
    icon?: React_2.ReactNode;
    illustration?: React_2.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: "default" | "outline" | "secondary";
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    size?: "sm" | "default" | "lg";
}

export declare const ExternalLink: React_2.ForwardRefExoticComponent<ExternalLinkProps & React_2.RefAttributes<HTMLAnchorElement>>;

export declare interface ExternalLinkProps extends React_2.AnchorHTMLAttributes<HTMLAnchorElement> {
    showIcon?: boolean;
    iconPosition?: "left" | "right";
    iconSize?: number;
}

export declare function FeedbackButton({ formUrl, formFields, currentPath, position, className, }: FeedbackButtonProps): JSX.Element;

export declare interface FeedbackButtonProps {
    /** Google Form URL for submission */
    formUrl?: string;
    /** Field entry IDs for the Google Form */
    formFields?: {
        url?: string;
        name?: string;
        email?: string;
        message?: string;
    };
    /** Current page path to include in feedback */
    currentPath?: string;
    /** Position of the floating button */
    position?: "bottom-right" | "bottom-left";
    /** Custom class for the button */
    className?: string;
}

export declare const FilterBar: React_2.ForwardRefExoticComponent<FilterBarProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface FilterBarProps extends React_2.HTMLAttributes<HTMLDivElement> {
    filters: ActiveFilter[];
    filterOptions: FilterOption[];
    onAddFilter: (option: FilterOption) => void;
    onRemoveFilter: (index: number) => void;
    onFilterClick?: (filter: ActiveFilter, index: number) => void;
}

export declare const FilterChip: React_2.ForwardRefExoticComponent<FilterChipProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface FilterChipProps extends React_2.HTMLAttributes<HTMLDivElement> {
    filter: ActiveFilter;
    onRemove?: () => void;
    onClick?: () => void;
}

export declare interface FilterOption {
    label: string;
    value: string;
    icon?: React_2.ReactNode;
}

export declare const FormField: React_2.ForwardRefExoticComponent<FormFieldProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface FormFieldProps {
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    children: React_2.ReactNode;
    className?: string;
    id?: string;
}

export declare const IconButton: React_2.ForwardRefExoticComponent<IconButtonProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface IconButtonProps extends React_2.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null;
    size?: "default" | "sm" | "lg" | "xs" | null;
}

export declare const iconButtonVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "sm" | "lg" | "xs" | null | undefined;
} & ClassProp) | undefined) => string;

export declare const Input: React_2.ForwardRefExoticComponent<InputProps & React_2.RefAttributes<HTMLInputElement>>;

export declare interface InputProps extends React_2.InputHTMLAttributes<HTMLInputElement> {
}

export declare const Label: React_2.ForwardRefExoticComponent<Omit<LabelPrimitive.LabelProps & React_2.RefAttributes<HTMLLabelElement>, "ref"> & React_2.RefAttributes<HTMLLabelElement>>;

export { Legend }

export { Line }

export declare const LineChart: React_2.ForwardRefExoticComponent<LineChartProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface LineChartDataPoint {
    [key: string]: string | number;
}

export declare interface LineChartProps extends React_2.HTMLAttributes<HTMLDivElement> {
    data: LineChartDataPoint[];
    lines: LineConfig[];
    xAxisKey: string;
    height?: number;
    title?: string;
    description?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    xAxisFormatter?: (value: string) => string;
    yAxisFormatter?: (value: number) => string;
    tooltipFormatter?: (value: number, name: string) => string;
    loading?: boolean;
}

export declare interface LineConfig {
    dataKey: string;
    name?: string;
    color?: string;
    strokeWidth?: number;
    dot?: boolean;
    type?: "linear" | "monotone" | "step" | "stepBefore" | "stepAfter";
}

export declare const MainContent: React_2.ForwardRefExoticComponent<MainContentProps & React_2.RefAttributes<HTMLElement>>;

export declare interface MainContentProps extends React_2.HTMLAttributes<HTMLElement> {
    sidebarCollapsed?: boolean;
    hasSidebar?: boolean;
}

export declare const MetricCard: React_2.ForwardRefExoticComponent<MetricCardProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface MetricCardProps extends React_2.HTMLAttributes<HTMLDivElement>, VariantProps<typeof metricCardVariants> {
    title: string;
    value: string | number;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon?: React_2.ReactNode;
    description?: string;
    trend?: React_2.ReactNode;
}

export declare const metricCardVariants: (props?: ({
    size?: "default" | "sm" | "lg" | null | undefined;
} & ClassProp) | undefined) => string;

export declare const PageContent: React_2.ForwardRefExoticComponent<PageContentProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface PageContentProps extends React_2.HTMLAttributes<HTMLDivElement> {
}

export declare const PageHeader: React_2.ForwardRefExoticComponent<PageHeaderProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface PageHeaderProps extends React_2.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    actions?: React_2.ReactNode;
}

export declare const PageNavigation: React_2.ForwardRefExoticComponent<PageNavigationProps & React_2.RefAttributes<HTMLElement>>;

export declare interface PageNavigationProps extends React_2.HTMLAttributes<HTMLElement> {
    previous?: PageNavItem;
    next?: PageNavItem;
    onNavigate?: (href: string) => void;
}

export declare interface PageNavItem {
    title: string;
    href: string;
}

export declare const Pagination: React_2.ForwardRefExoticComponent<PaginationProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface PaginationProps extends React_2.HTMLAttributes<HTMLDivElement> {
    currentPage: number;
    totalPages: number;
    totalRecords?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    showPageSize?: boolean;
    showTotalRecords?: boolean;
    showFirstLast?: boolean;
}

export { Pie }

export declare const PieChart: React_2.ForwardRefExoticComponent<PieChartProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface PieChartDataPoint {
    name: string;
    value: number;
    color?: string;
    [key: string]: string | number | undefined;
}

export declare interface PieChartProps extends React_2.HTMLAttributes<HTMLDivElement> {
    data: PieChartDataPoint[];
    height?: number;
    title?: string;
    description?: string;
    showLegend?: boolean;
    innerRadius?: number;
    outerRadius?: number;
    tooltipFormatter?: (value: number, name: string) => string;
    loading?: boolean;
    donut?: boolean;
    showLabels?: boolean;
    labelFormatter?: (entry: PieChartDataPoint) => string;
}

export declare const Popover: React_2.FC<PopoverPrimitive.PopoverProps>;

export declare const PopoverAnchor: React_2.ForwardRefExoticComponent<PopoverPrimitive.PopoverAnchorProps & React_2.RefAttributes<HTMLDivElement>>;

export declare const PopoverContent: React_2.ForwardRefExoticComponent<Omit<PopoverPrimitive.PopoverContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const PopoverTrigger: React_2.ForwardRefExoticComponent<PopoverPrimitive.PopoverTriggerProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare const Progress: React_2.ForwardRefExoticComponent<Omit<ProgressPrimitive.ProgressProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & {
    indicatorClassName?: string;
} & React_2.RefAttributes<HTMLDivElement>>;

export declare const RadioGroup: React_2.ForwardRefExoticComponent<Omit<RadioGroupPrimitive.RadioGroupProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const RadioGroupItem: React_2.ForwardRefExoticComponent<Omit<RadioGroupPrimitive.RadioGroupItemProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export { RechartsAreaChart }

export { RechartsBarChart }

export { RechartsLineChart }

export { RechartsPieChart }

export { RechartsTooltip }

export declare const RefreshButton: React_2.ForwardRefExoticComponent<RefreshButtonProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface RefreshButtonProps extends Omit<IconButtonProps, "children"> {
    loading?: boolean;
    onRefresh?: () => void;
}

export { ResponsiveContainer }

export declare const ScrollArea: React_2.ForwardRefExoticComponent<Omit<ScrollAreaPrimitive.ScrollAreaProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const ScrollBar: React_2.ForwardRefExoticComponent<Omit<ScrollAreaPrimitive.ScrollAreaScrollbarProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SearchInput: React_2.ForwardRefExoticComponent<SearchInputProps & React_2.RefAttributes<HTMLInputElement>>;

export declare interface SearchInputProps extends Omit<React_2.InputHTMLAttributes<HTMLInputElement>, "type"> {
    onClear?: () => void;
    showClearButton?: boolean;
}

export declare const Select: React_2.FC<SelectPrimitive.SelectProps>;

export declare const SelectContent: React_2.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SelectGroup: React_2.ForwardRefExoticComponent<SelectPrimitive.SelectGroupProps & React_2.RefAttributes<HTMLDivElement>>;

export declare const SelectItem: React_2.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectItemProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SelectLabel: React_2.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectLabelProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SelectScrollDownButton: React_2.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectScrollDownButtonProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SelectScrollUpButton: React_2.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectScrollUpButtonProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SelectSeparator: React_2.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectSeparatorProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SelectTrigger: React_2.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectTriggerProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare const SelectValue: React_2.ForwardRefExoticComponent<SelectPrimitive.SelectValueProps & React_2.RefAttributes<HTMLSpanElement>>;

export declare const Separator: React_2.ForwardRefExoticComponent<Omit<SeparatorPrimitive.SeparatorProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare interface ServiceStatus {
    name: string;
    status: "healthy" | "unhealthy";
    error?: string;
}

export declare const Sidebar: React_2.ForwardRefExoticComponent<SidebarProps & React_2.RefAttributes<HTMLElement>>;

export declare const SidebarItem: React_2.ForwardRefExoticComponent<SidebarItemProps & React_2.AnchorHTMLAttributes<HTMLAnchorElement> & React_2.RefAttributes<HTMLAnchorElement>>;

export declare interface SidebarItemProps extends React_2.HTMLAttributes<HTMLElement> {
    icon?: React_2.ReactNode;
    active?: boolean;
    collapsed?: boolean;
    asChild?: boolean;
}

export declare const SidebarNestedItem: React_2.ForwardRefExoticComponent<SidebarNestedItemProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface SidebarNestedItemProps {
    /** Label text for the nested item */
    label: string;
    /** Icon to display */
    icon?: React_2.ReactNode;
    /** Whether this item is currently active */
    active?: boolean;
    /** Whether the sidebar is collapsed */
    collapsed?: boolean;
    /** Children items to render when expanded */
    children?: React_2.ReactNode;
    /** Default expanded state */
    defaultExpanded?: boolean;
    /** Controlled expanded state */
    expanded?: boolean;
    /** Callback when expanded state changes */
    onExpandedChange?: (expanded: boolean) => void;
    /** Click handler for the item (if no children) */
    onClick?: () => void;
    /** Href for the item (if no children) */
    href?: string;
    /** Additional className */
    className?: string;
}

export declare interface SidebarProps extends React_2.HTMLAttributes<HTMLElement> {
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    collapsible?: boolean;
    header?: React_2.ReactNode;
    footer?: React_2.ReactNode;
}

export declare const SidebarSection: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    collapsed?: boolean;
} & React_2.RefAttributes<HTMLDivElement>>;

export declare const SidebarSeparator: React_2.ForwardRefExoticComponent<React_2.HTMLAttributes<HTMLDivElement> & React_2.RefAttributes<HTMLDivElement>>;

export declare const SidebarSubItem: React_2.ForwardRefExoticComponent<SidebarSubItemProps & React_2.RefAttributes<HTMLAnchorElement>>;

export declare interface SidebarSubItemProps extends React_2.AnchorHTMLAttributes<HTMLAnchorElement> {
    /** Icon to display */
    icon?: React_2.ReactNode;
    /** Whether this item is currently active */
    active?: boolean;
}

export declare const Skeleton: React_2.ForwardRefExoticComponent<SkeletonProps & React_2.RefAttributes<HTMLDivElement>>;

export declare const SkeletonAvatar: React_2.ForwardRefExoticComponent<SkeletonAvatarProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface SkeletonAvatarProps extends React_2.HTMLAttributes<HTMLDivElement> {
    /** Size of the avatar skeleton */
    size?: "sm" | "md" | "lg" | number;
    /** Whether to animate */
    animate?: boolean;
}

export declare const SkeletonCard: React_2.ForwardRefExoticComponent<SkeletonCardProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface SkeletonCardProps extends React_2.HTMLAttributes<HTMLDivElement> {
    /** Whether to show header skeleton */
    showHeader?: boolean;
    /** Whether to show avatar in header */
    showAvatar?: boolean;
    /** Number of content lines */
    contentLines?: number;
    /** Whether to show action buttons */
    showActions?: boolean;
    /** Whether to animate */
    animate?: boolean;
}

export declare interface SkeletonProps extends React_2.HTMLAttributes<HTMLDivElement> {
    /** Width of the skeleton. Can be a number (px) or string (e.g., "100%") */
    width?: number | string;
    /** Height of the skeleton. Can be a number (px) or string (e.g., "1rem") */
    height?: number | string;
    /** Shape variant of the skeleton */
    variant?: "rectangular" | "circular" | "text";
    /** Whether to animate the skeleton */
    animate?: boolean;
}

export declare const SkeletonText: React_2.ForwardRefExoticComponent<SkeletonTextProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface SkeletonTextProps extends React_2.HTMLAttributes<HTMLDivElement> {
    /** Number of lines to render */
    lines?: number;
    /** Gap between lines */
    gap?: number | string;
    /** Whether to animate */
    animate?: boolean;
}

export declare const Slider: React_2.ForwardRefExoticComponent<Omit<SliderPrimitive.SliderProps & React_2.RefAttributes<HTMLSpanElement>, "ref"> & React_2.RefAttributes<HTMLSpanElement>>;

export declare const SQLEditor: React_2.ForwardRefExoticComponent<SQLEditorProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface SQLEditorProps {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string | undefined) => void;
    onExecute?: (query: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    height?: string | number;
    minHeight?: string | number;
    maxHeight?: string | number;
    showLineNumbers?: boolean;
    showMinimap?: boolean;
    wordWrap?: "on" | "off" | "wordWrapColumn" | "bounded";
    fontSize?: number;
    tabSize?: number;
    theme?: "light" | "dark" | "e6data-dark" | "e6data-light";
    schemas?: TableSchema[];
    className?: string;
    showToolbar?: boolean;
    showRunButton?: boolean;
    showCopyButton?: boolean;
    showFullscreenButton?: boolean;
    showResetButton?: boolean;
    loading?: boolean;
    disabled?: boolean;
}

export declare interface SQLEditorTheme {
    base: "vs" | "vs-dark" | "hc-black";
    colors?: Record<string, string>;
    rules?: editor.ITokenThemeRule[];
}

export declare interface StackConfig {
    dataKey: string;
    name: string;
    color: string;
    stackId?: string;
}

export declare const StackedBarChart: React_2.ForwardRefExoticComponent<StackedBarChartProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface StackedBarChartDataPoint {
    [key: string]: string | number;
}

export declare interface StackedBarChartProps extends React_2.HTMLAttributes<HTMLDivElement> {
    data: StackedBarChartDataPoint[];
    stacks: StackConfig[];
    xAxisKey: string;
    height?: number;
    title?: string;
    description?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    layout?: "horizontal" | "vertical";
    tooltipFormatter?: (value: number, name: string) => string;
    xAxisFormatter?: (value: string) => string;
    yAxisFormatter?: (value: number) => string;
    loading?: boolean;
}

export declare const StatCard: React_2.ForwardRefExoticComponent<StatCardProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface StatCardProps extends React_2.HTMLAttributes<HTMLDivElement> {
    label: string;
    value: string | number;
    previousValue?: string | number;
    percentChange?: number;
    prefix?: string;
    suffix?: string;
    loading?: boolean;
}

export declare const StatusBadge: React_2.ForwardRefExoticComponent<StatusBadgeProps & React_2.RefAttributes<HTMLSpanElement>>;

export declare interface StatusBadgeProps extends React_2.HTMLAttributes<HTMLSpanElement> {
    status?: "active" | "disabled" | "accepted" | "pending" | "suspended" | "error" | "warning" | null;
    showDot?: boolean;
}

export declare const statusBadgeVariants: (props?: ({
    status?: "disabled" | "warning" | "active" | "accepted" | "pending" | "suspended" | "error" | null | undefined;
    showDot?: boolean | null | undefined;
} & ClassProp) | undefined) => string;

export declare function StatusBar({ services, loading, error, className, }: StatusBarProps): JSX.Element;

export declare interface StatusBarProps {
    /** Array of service statuses to display */
    services?: ServiceStatus[];
    /** Whether the status is loading */
    loading?: boolean;
    /** Error message if status couldn't be fetched */
    error?: string | null;
    /** Custom class */
    className?: string;
}

export declare const Switch: React_2.ForwardRefExoticComponent<Omit<SwitchPrimitives.SwitchProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare const TabBar: React_2.ForwardRefExoticComponent<TabBarProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface TabBarProps extends React_2.HTMLAttributes<HTMLDivElement> {
    tabs: TabItem[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    variant?: "underline" | "pills" | "enclosed";
    size?: "sm" | "default" | "lg";
}

export declare interface TabItem {
    id: string;
    label: string;
    icon?: React_2.ReactNode;
    disabled?: boolean;
    badge?: string | number;
}

export declare const TableOfContents: React_2.ForwardRefExoticComponent<TableOfContentsProps & React_2.RefAttributes<HTMLElement>>;

export declare interface TableOfContentsProps extends React_2.HTMLAttributes<HTMLElement> {
    items: TocItem[];
    activeId?: string;
    onItemClick?: (id: string) => void;
}

export declare interface TableSchema {
    name: string;
    columns: {
        name: string;
        type: string;
        description?: string;
    }[];
}

export declare const Tabs: React_2.ForwardRefExoticComponent<TabsPrimitive.TabsProps & React_2.RefAttributes<HTMLDivElement>>;

export declare const TabsContent: React_2.ForwardRefExoticComponent<Omit<TabsPrimitive.TabsContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const TabsList: React_2.ForwardRefExoticComponent<Omit<TabsPrimitive.TabsListProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const TabsTrigger: React_2.ForwardRefExoticComponent<Omit<TabsPrimitive.TabsTriggerProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare const Textarea: React_2.ForwardRefExoticComponent<TextareaProps & React_2.RefAttributes<HTMLTextAreaElement>>;

export declare interface TextareaProps extends React_2.TextareaHTMLAttributes<HTMLTextAreaElement> {
}

export declare const Toast: React_2.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastProps & React_2.RefAttributes<HTMLLIElement>, "ref"> & {
    variant?: "default" | "destructive" | "success" | null;
} & React_2.RefAttributes<HTMLLIElement>>;

export declare function toast({ ...props }: Toast_2): {
    id: string;
    dismiss: () => void;
    update: (props: ToasterToast) => void;
};

declare type Toast_2 = Omit<ToasterToast, "id">;

export declare const ToastAction: React_2.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastActionProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare type ToastActionElement = React_2.ReactElement<typeof ToastAction>;

export declare const ToastClose: React_2.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastCloseProps & React_2.RefAttributes<HTMLButtonElement>, "ref"> & React_2.RefAttributes<HTMLButtonElement>>;

export declare const ToastDescription: React_2.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastDescriptionProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare function Toaster(): JSX.Element;

declare type ToasterToast = ToastProps & {
    id: string;
    title?: React_2.ReactNode;
    description?: React_2.ReactNode;
    action?: ToastActionElement;
};

export declare type ToastProps = React_2.ComponentPropsWithoutRef<typeof Toast>;

export declare const ToastProvider: React_2.FC<ToastPrimitives.ToastProviderProps>;

export declare const ToastTitle: React_2.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastTitleProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const ToastViewport: React_2.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastViewportProps & React_2.RefAttributes<HTMLOListElement>, "ref"> & React_2.RefAttributes<HTMLOListElement>>;

export declare interface TocItem {
    id: string;
    title: string;
    level: number;
}

export declare const Tooltip: React_2.FC<TooltipPrimitive.TooltipProps>;

export declare const TooltipContent: React_2.ForwardRefExoticComponent<Omit<TooltipPrimitive.TooltipContentProps & React_2.RefAttributes<HTMLDivElement>, "ref"> & React_2.RefAttributes<HTMLDivElement>>;

export declare const TooltipProvider: React_2.FC<TooltipPrimitive.TooltipProviderProps>;

export declare const TooltipTrigger: React_2.ForwardRefExoticComponent<TooltipPrimitive.TooltipTriggerProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare const TopBar: React_2.ForwardRefExoticComponent<TopBarProps & React_2.RefAttributes<HTMLElement>>;

export declare const TopBarButton: React_2.ForwardRefExoticComponent<TopBarButtonProps & React_2.RefAttributes<HTMLButtonElement>>;

export declare interface TopBarButtonProps extends React_2.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React_2.ReactNode;
}

export declare interface TopBarProps extends React_2.HTMLAttributes<HTMLElement> {
    left?: React_2.ReactNode;
    right?: React_2.ReactNode;
}

export declare interface TreeNode {
    id: string;
    label: string;
    icon?: React_2.ReactNode;
    children?: TreeNode[];
    disabled?: boolean;
    data?: Record<string, unknown>;
}

export declare const TreeView: React_2.ForwardRefExoticComponent<TreeViewProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface TreeViewProps extends Omit<React_2.HTMLAttributes<HTMLDivElement>, "onSelect"> {
    data: TreeNode[];
    selectedIds?: string[];
    expandedIds?: string[];
    onSelect?: (ids: string[]) => void;
    onExpand?: (ids: string[]) => void;
    onNodeClick?: (node: TreeNode) => void;
    showCheckboxes?: boolean;
    multiSelect?: boolean;
}

export declare function useCommandPalette(options?: UseCommandPaletteOptions): {
    open: boolean;
    setOpen: React_2.Dispatch<React_2.SetStateAction<boolean>>;
};

export declare interface UseCommandPaletteOptions {
    /** Keyboard shortcut to open the palette (default: 'k') */
    key?: string;
    /** Modifier key (default: true for cmd/ctrl) */
    withModifier?: boolean;
}

export declare function useToast(): {
    toast: typeof toast;
    dismiss: (toastId?: string) => void;
    toasts: ToasterToast[];
};

export declare const Wizard: React_2.ForwardRefExoticComponent<WizardProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface WizardProps {
    children: React_2.ReactNode;
    className?: string;
}

export declare const WizardStep: React_2.ForwardRefExoticComponent<WizardStepProps & React_2.RefAttributes<HTMLDivElement>>;

export declare interface WizardStepProps {
    stepNumber: number;
    title: string;
    description?: string;
    status: WizardStepStatus;
    children: React_2.ReactNode;
    onEdit?: () => void;
    className?: string;
}

export declare type WizardStepStatus = "locked" | "active" | "done";

export { XAxis }

export { YAxis }

export { }
