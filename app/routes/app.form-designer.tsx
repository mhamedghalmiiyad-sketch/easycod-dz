import React, { useState, useCallback, useEffect, useRef, Fragment, useMemo } from 'react';

/* -------------------------------------------------------------------------- */
/* Remix Imports                                                              */
/* -------------------------------------------------------------------------- */
import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, useSubmit, useFetcher, useNavigation } from "@remix-run/react";
// Using standard fetch instead of authenticated fetch hook
import { db } from "../db.server";
import { authenticate } from "../shopify.server";
import {
    getShopSettings,
    updateShopSettings,
    parseJsonField,
    upsertShopSettings
} from "~/utils/shopSettings";
import { useTranslation } from "react-i18next";
import { getLanguageFromRequest, getTranslations, isRTL } from "../utils/i18n.server";

/* -------------------------------------------------------------------------- */
/* Polaris Imports                                                            */
/* -------------------------------------------------------------------------- */
import {
    AppProvider, BlockStack, Button, Checkbox, Select, RangeSlider,
    TextField, Text, Card, Collapsible, Popover, ActionList, Icon,
    IndexTable, Frame, Grid, LegacyStack, ChoiceList, Divider, Box,
    IconSource, Badge, Link, ButtonGroup, Modal, Page, FormLayout, Banner,
    EmptyState, List as PolarisList,Autocomplete,Tag
} from '@shopify/polaris';

/* Shopify Polaris Icons (replaced by <s-icon>) */
// kept for any legacy Polaris-only code – remove if unused
import {
    ViewIcon, HideIcon, EditIcon, DragHandleIcon, ChevronUpIcon, ChevronDownIcon,
    PlusIcon, MobileIcon, CodeIcon, PaintBrushFlatIcon,
    ImageIcon as PolarisImageIcon, FileIcon,
    ChatIcon, NoteIcon, SelectIcon, ButtonIcon as PolarisButtonIcon, CheckboxIcon as PolarisCheckboxIcon, CalendarIcon, LinkIcon as PolarisLinkIcon,
    LockIcon as PolarisLockIcon, DeleteIcon, InfoIcon, CheckIcon,
    OrderIcon, CartIcon, ArrowUpIcon, ArrowDownIcon,
    ImportIcon, SettingsIcon, ReplayIcon, QuestionCircleIcon, RefreshIcon,
    StarFilledIcon, TextBlockIcon, AlertTriangleIcon, ImageIcon, LinkIcon // <--- ADD THIS LINE
} from '@shopify/polaris-icons';
import { CartIcon as ShipmentIcon } from '@shopify/polaris-icons';
import '@shopify/polaris/build/esm/styles.css';

const LOGO_URLS = {
  noest: 'https://noest-dz.com/assets/img/logo_colors_new.png',
  zrexpress: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZxHvGXoYQT8lqMfuIMeJwPRJpStDRo3C0mQ&s',
  procolis: 'https://colireli.net/COLIRELI_WEB/ext/LogoReli.png',
  ecotrack: 'https://scontent.falg2-2.fna.fbcdn.net/v/t39.30808-6/290779022_168435365636949_3493377630337235377_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFW7eBnD5_vUn6i-FLFrJZwx9lGA_mbCPrH2UYD-ZsI-n8sfewwe01MtnFxqF4Kllla3pqRwRypxEUSdIkPJlpM&_nc_ohc=SXxxDjmk0YQQ7kNvwEB_xty&_nc_oc=AdkcF1ah1md1mz_i4V5MJgkMspPfKPDNIELAkjOBUsZvqsw6wMstdQQ5VNMuyUTCAS0&_nc_zt=23&_nc_ht=scontent.falg2-2.fna&_nc_gid=2lmIR87A35U80Kr5bbwGfg&oh=00_AfQjF-QC2KXmrOojkmRaIW-7Dk7f7FsqkchQtl9RyKpxxg&oe=6892F338',
  dhd: 'https://dhd-dz.com/assets/img/logo.png',
  anderson: 'https://cdn1.ecotrack.dz/anderson/images/login_logoctVbSeP.png',
  areex: 'https://scontent.falg2-2.fna.fbcdn.net/v/t39.30808-6/461527846_507305658774807_2217222383041366664_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeF9GY2gK88f30B51TkyGT9MK1MDYhGx108rUwNiEbHXT7wZpjeieEd4m2Fe5Vkx_g1PtaSM1cgNY1KsnFnx1PYw&_nc_ohc=mRNcXYxrmiAQ7kNvwF_KYko&_nc_oc=AdkOkxKWikR2xhiFkHTYkfzD2omyzVWbVqU2MOjmgGuZ8VMFGmfZEpe787Zfovy0wVE&_nc_zt=23&_nc_ht=scontent.falg2-2.fna&_nc_gid=FvDOLB5OXSbgjOY3K0_FEw&oh=00_AfRHt0f7tlqjlLcR1_D9xllvHGlmZlqRKCCSjKmTbpxZXQ&oe=6892EE5A',
  baconsult: 'https://cdn1.ecotrack.dz/bacexpress/images/login_logoeORMVno.png',
  conexlog: 'https://conexlog-dz.com/assets/img/logo.svg',
  coyoteexpress: 'https://coyotedz.com/assets/img/coyote3.png',
  distazero: 'https://cdn1.ecotrack.dz/distazero/images/login_logooI8OebS.png',
  '48hr': 'https://scontent.falg2-2.fna.fbcdn.net/v/t39.30808-6/305769282_479708007506758_5994560203379088099_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFn8Xkir2npb-s3hD-I6KBjeTX99aa_4Ph5Nf31pr_g-Nxw5IIr-b8i346dSSpBufkJV_bardNYZ9Gig75Qmgu0&_nc_ohc=IHykBvSzDl4Q7kNvwGnzl8a&_nc_oc=AdmWi90krnh1V41iP6hxhzNU4kSShYvKB3Va19nqWWWz42XtdQNaM5l1j7CrxQzgGsA&_nc_zt=23&_nc_ht=scontent.falg2-2.fna&_nc_gid=JVzZYw-MtZa4MAGzjhMRgw&oh=00_AfTw1giUCUAXcs7CMWyLZenSNk6NLGWd8Rh3zf3iC96scw&oe=689324DE',
  fretdirect: 'https://www.fret.direct/images/logoFRETs.png',
  golivri: 'https://cdn1.ecotrack.dz/golivri/images/login_logoP2208XU.png',
  msmgo: 'https://scontent.falg2-2.fna.fbcdn.net/v/t39.30808-6/458740709_938179221669263_4771285373707372818_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeEIax1X7sD1rNENpMejoefkrFNm_tKlS-GsU2b-0qVL4egWBaawfWqqGjtvfyXRhBEOj8wMwhlY5BiZDxhitxzJ&_nc_ohc=ihWLq6LC3PEQ7kNvwH1WyF_&_nc_oc=Adlt_Db-KC1KnMobPrGOx1snkj8Ru170vlBgAjULl5qlgJPxxuWFKRHOI2khDOFLrlQ&_nc_zt=23&_nc_ht=scontent.falg2-2.fna&_nc_gid=fYNwXNk2VO9uQQDyDR6w-Q&oh=00_AfR_zhhPPlBpQECLHYaKUXWdtVeQgUNATJ1pP6WhCKdO3w&oe=6892DDBC',
  packers: 'https://packers-dz.com/assets/img/PackersLogo.png',
  prest: 'https://www.prest-dz.com/wp-content/uploads/2024/04/cropped-logo@2x-300x49.png',
  rex: 'https://cdn1.ecotrack.dz/rex/images/login_logoCu3Rwdm.png',
  rocket: 'https://cdn1.ecotrack.dz/rocket/images/login_logogAux6nt.png',
  salva: 'https://cdn1.ecotrack.dz/salvadelivery/images/login_logo6GOyzNz.png',
  speed: 'https://www.easyandspeed.dz/wp-content/uploads/2025/01/cropped-cropped-easy-_-speed-logo-hcolor-135x102.png', // No logo URL provided
  tsl: 'https://cdn1.ecotrack.dz/tsl/images/login_logoxDIzsCJ.png',
  maystro: 'https://maystro-delivery.com/img/Maystro-blue-extonly.svg'
};
type LogoKey = keyof typeof LOGO_URLS;
/* -------------------------------------------------------------------------- */
/* Shopify App Bridge UI Web Components                                       */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/* Shopify App Bridge Icons                                                   */
/* -------------------------------------------------------------------------- */
declare global {
    namespace JSX {
        interface IntrinsicElements {
            's-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                type?: string;
                size?: 'small' | 'base';
                tone?: string;
                color?: string;
            };
            's-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLElement>, HTMLElement> & {
                variant?: 'primary' | 'secondary' | 'plain';
            };
            's-number-field': React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
                label?: string;
                value?: string;
                details?: string;
                error?: string;
                placeholder?: string;
                prefix?: string;
                suffix?: string;
                'label-hidden'?: boolean;
                'read-only'?: boolean;
                'input-mode'?: 'decimal' | 'numeric';
                'label-accessibility-visibility'?: 'visible' | 'exclusive';
                // The following are inherited but included for clarity
                min?: string;
                max?: string;
                step?: string;
                disabled?: boolean;
                required?: boolean;
                name?: string;
            };
            's-avatar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                alt?: string;
                initials?: string;
                size?: "small" | "small-200" | "base" | "large" | "large-200";
                src?: string;
            };
        }
    }
}


/* -------------------------------------------------------------------------- */
/* Add the custom component registration                                      */
/* -------------------------------------------------------------------------- */
declare global {
    namespace JSX {
        interface IntrinsicElements {
            /* ... existing entries ... */
            's-divider': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            > & {
                color?: 'base' | 'strong';
                direction?: 'inline' | 'block';
            };
        }
    }
}

/* -------------------------------------------------------------------------- */
/* MUI Imports                                                                */
/* -------------------------------------------------------------------------- */
import {
    Box as MuiBox, Button as MuiButton, Card as MuiCard, CircularProgress, IconButton, InputAdornment,
    List, ListItem, Popover as MuiPopover, Slider as MuiSlider, Stack as MuiStack,
    TextField as MuiTextField, Typography, createTheme, ThemeProvider, CssBaseline,
    alpha, Collapse as MuiCollapse, Snackbar, Alert, AlertTitle,
    FormControlLabel, FormLabel, RadioGroup, Radio as MuiRadio, FormHelperText,
    Select as MuiSelect, MenuItem, InputLabel, FormControl as MuiFormControl,
    Checkbox as MuiCheckbox, Link as MuiLink
} from '@mui/material';
import {
    Visibility, VisibilityOff, Close, PersonOutline, HomeOutlined,
    AlternateEmail, VpnKeyOutlined, NotesOutlined, LocationCityOutlined, LocalShippingOutlined,
    DialpadOutlined, RotateLeft
} from '@mui/icons-material';
import { RangeSliderValue } from '@shopify/polaris/build/ts/src/components/RangeSlider/types';

// At the top of the file, with other imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


/* -------------------------------------------------------------------------- */
/* Interfaces & Types                                                         */
/* -------------------------------------------------------------------------- */
interface BaseFieldSettings {
    label?: string;
    required?: boolean;
    layoutOverride?: 'default' | 'single' | 'double';
}
interface IconFeature {
  enabled: boolean;
  imageUrl: string;
  caption: string;
}
interface CustomIconFeatureSettings extends BaseFieldSettings {
  title: string;
  titlePosition: 'top' | 'bottom';
  features: IconFeature[];
  layout?: 'auto' | 'triangle';
}
interface CommonTextFieldSettings extends BaseFieldSettings {
    placeholder?: string;
    showIcon?: boolean;
    minLength?: number;
    maxLength?: number;
    prefixText?: string;
    invalidValueError?: string;
}

interface ButtonSettings {
    buttonText: string;
    buttonSubtitle?: string;
    animation: 'none' | 'shaker' | 'bounce' | 'pulse' | 'wobble' | 'glitch-text' | 'neon-pulse' | 'border-reveal' | 'rotate-3d-plane' | 'gradient-wave' | 'money-rain' | 'heartbeat' | 'flash-glow' | 'typing-effect' | 'coin-flip' | 'cash-magnet' | 'order-processing';
    icon?: string;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    shadow: number;
    layout?: 'full-width' | 'half-left' | 'half-right';
}

interface TotalsSummarySettings {
    subtotalTitle: string;
    shippingTitle: string;
    totalTitle: string;
    showTaxesMessage: boolean; // Kept in interface for data consistency, but removed from UI
    backgroundColor: string;
}

interface ShippingRatesSettings {
    title: string;
    freeText: string;
    enableCompanySelection: boolean;
    companySelectionMode: 'dropdown' | 'radio' | 'auto_cheapest' | 'auto_default';
    deliveryTypeMode: 'both' | 'home_only' | 'stopdesk_only' | 'user_choice';
    defaultDeliveryType: 'home' | 'stopdesk';
    // REMOVED: showWilayaField, wilayaFieldLabel, showCommuneField, communeFieldLabel, wilayaLanguage, communeLanguage
selectWilayaPrompt: string;
    selectedDeliveryCompanies: string[]; // Array of selected company IDs
}


interface DiscountCodesSettings {
    limitToOne: boolean;
    discountsLineText: string;
    discountCodeFieldLabel: string;
    applyButtonText: string;
    applyButtonBackgroundColor: string;
    invalidDiscountCodeErrorText: string;
    oneDiscountAllowedErrorText: string;
}

interface CustomTextSettings {
    text: string;
    alignment: 'left' | 'center' | 'right';
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    textColor: string;
}

interface PhoneFieldSettings extends CommonTextFieldSettings {
    invalidPhoneErrorText?: string;
}

interface CityFieldSettings extends BaseFieldSettings {
    placeholder?: string;
    disableDropdown?: boolean;
}

interface EmailFieldSettings extends CommonTextFieldSettings {
    disableValidation?: boolean;
    invalidEmailErrorText?: string;
}

interface NewsletterSettings extends BaseFieldSettings {
    preselect: boolean;
}

interface TermsSettings extends BaseFieldSettings {
    termsUrl?: string;
}

// START: New Logistics Interfaces
export interface LogisticsDeliverySettings extends BaseFieldSettings {
  title: string;
  apiProvider: 'noest' | 'ecotrack' | 'dhd' | 'anderson' | 'areex' | 'baconsult' | 'conexlog' | 'coyoteexpress' | 'distazero' | '48hr' | 'fretdirect' | 'golivri' | 'msmgo' | 'packers' | 'prest' | 'rex' | 'rocket' | 'salva' | 'speed' | 'tsl' | 'Maystro Delivery' | 'zrexpress' | 'procolis' | 'manual';
  apiToken: string;
  userGuid: string;
  apiUrl: string;
  showStopDesk: boolean;
  apiKey?: string;
  showHomeDelivery: boolean;
  defaultDeliveryType: 'home' | 'stopdesk';
  algeriaWilayaMode: 'arabic' | 'french';
  algeriaCommuneMode: 'arabic' | 'french';
  manualRates?: DeliveryRate[];
  showWilayaNumbers: boolean;
  hiddenWilayas?: string[]; 
  
  // Add all missing required properties with default values
  enableCompanySelection: boolean;
  visibleCompanies: string[];
  companySelectionMode: 'dropdown' | 'radio' | 'auto_cheapest' | 'auto_default';
  defaultCompany?: string;
  allowCompanyOverride: boolean;
  deliveryTypeMode: 'both' | 'home_only' | 'stopdesk_only' | 'user_choice';
  showWilayaField: boolean;
  showCommuneField: boolean;
  wilayaFieldLabel: string;
  communeFieldLabel: string;
  showManualRates: boolean;
  maxManualRatesToShow?: number;
}

export interface DeliveryRate {
    wilayaId: number;
    wilayaName: string;
    wilayaNameArabic: string;
    homeDeliveryPrice: number;
    stopDeskPrice: number;
    apiProvider?: string;
}

interface AlgeriaLocation {
    id: number;
    commune_name: string;
    commune_name_ascii: string;
    daira_name: string;
    daira_name_ascii: string;
    wilaya_code: string;
    wilaya_name: string;
    wilaya_name_ascii: string;
}
// END: New Logistics Interfaces


interface SubmitButtonSettings extends ButtonSettings { }
interface CustomTitleSettings extends CustomTextSettings { }
interface CustomImageSettings { imageUrl: string; imageSize: number; aspectRatio?: string; }
interface ShopifyCheckoutButtonSettings extends ButtonSettings { discountType: 'none' | 'fixed_value' | 'percentage'; discountValue?: number; }
interface QuantitySelectorSettings {
    helpText: any;
    required: any; label: string; alignment: 'left' | 'center' | 'right';
}
interface WhatsappButtonSettings extends ButtonSettings { whatsappPhoneNumber: string; createOrderOnClick: boolean; prefilledMessage: string; }
interface CustomTextInputSettings extends CommonTextFieldSettings { connectTo?: string; allowOnlyNumbers?: boolean; }
interface CustomDropdownSettings extends BaseFieldSettings { placeholder: string; connectTo: 'nothing' | 'address' | 'address_2' | 'province' | 'city' | 'zip_code' | 'company_name'; values: string; }
interface CustomSingleChoiceSettings extends BaseFieldSettings { connectTo: 'nothing' | 'address' | 'address_2' | 'province' | 'city' | 'zip_code' | 'company_name'; preselectFirst: boolean; values: string; }
interface CustomCheckboxSettings extends BaseFieldSettings { checkboxName: string; }
interface CustomDateSelectorSettings extends BaseFieldSettings { placeholder: string; showIcon: boolean; excludeSundays: boolean; excludeSaturdays: boolean; allowOnlyNextDays: boolean; }
interface CustomLinkButtonSettings extends ButtonSettings { buttonUrl: string; }
interface CustomPasswordFieldSettings extends CommonTextFieldSettings { }

type AllFieldSettings =
    | BaseFieldSettings | CommonTextFieldSettings | TotalsSummarySettings
    | ShippingRatesSettings | DiscountCodesSettings | CustomTextSettings
    | PhoneFieldSettings | CityFieldSettings | EmailFieldSettings | NewsletterSettings | SubmitButtonSettings
    | TermsSettings
    | CustomTitleSettings | CustomImageSettings | ShopifyCheckoutButtonSettings
    | QuantitySelectorSettings | WhatsappButtonSettings | CustomTextInputSettings
    | CustomDropdownSettings | CustomSingleChoiceSettings | CustomCheckboxSettings
    | CustomDateSelectorSettings | CustomLinkButtonSettings | CustomPasswordFieldSettings
    | LogisticsDeliverySettings
    |CustomIconFeatureSettings;

export interface FormField {
    id: string;
    type: string;
    enabled: boolean;
    editable: boolean;
    label: string;
    settings: AllFieldSettings;
    required?: boolean;
}

interface FormStyle {
    textColor: string;
    fontSize: number;
    backgroundColor: string;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    shadow: number;
    hideFieldLabels: boolean;
    enableRTL: boolean;
    hideCloseButton?: boolean;
    enableFullScreenMobile?: boolean;
    title?: string; // Added
    description?: string; // Added
    mode?: 'popup' | 'embedded';
    layout: 'single' | 'double';
    primaryColor?: string;
    enableDinarConverter?: boolean;
     currencySymbol?: 'DA' | 'دج';
      popupButtonSettings?: {
        buttonText: string;
        backgroundColor: string;
        textColor: string;
        fontSize: number;
        borderRadius: number;
        borderWidth: number;
        borderColor: string;
        shadow: number;
        animation: string;
        placement: 'center' | 'left' | 'right';
        followUser: boolean; // For sticky footer behavior
    };
}

interface ExpandedSections { mode: boolean; fields: boolean; style: boolean; texts: boolean;dinarConverter?: boolean; }
type ConditionType = | 'price_gte' | 'price_lt' | 'weight_gte' | 'weight_lt' | 'quantity_gte' | 'quantity_lt' | 'includes_product' | 'excludes_product' | 'is_wilaya';
interface RateCondition { id: string; type: ConditionType; value: number | string | string[]; }
interface ShippingRate { id: string; name: string; description?: string; price: number; conditions: RateCondition[]; provinces?: string; }
interface ExtendedShippingRate extends ShippingRate {
    wilayaId?: number;
    apiProvider?: string;
    apiUrl?: string;
    wilayaName?: string;
    wilayaNameArabic?: string;
    groupName?: string;
}
/* -------------------------------------------------------------------------- */
/* Algerian Dinar Converter                                                   */
/* -------------------------------------------------------------------------- */
/**
 * Maps single digits to their Algerian Arabic names.
 */
export const ones: { [key: number]: string } = {
    1: 'واحد', 2: 'زوج', 3: 'ثلاثة', 4: 'ربعة', 5: 'خمسة',
    6: 'ستة', 7: 'سبعة', 8: 'ثمنية', 9: 'تسعة'
};
/**
 * Maps numbers 10-19 to their Algerian Arabic names.
 */
export const teens: { [key: number]: string } = {
    10: 'عشرة', 11: 'أحدعش', 12: 'أثنعش', 13: 'ثلاثطعش', 14: 'ربعطعش',
    15: 'خمسطعش', 16: 'ستطعش', 17: 'سبعطعش', 18: 'ثمنطعش', 19: 'تسعطعش'
};
/**
 * Maps tens (20, 30, etc.) to their Algerian Arabic names.
 */
export const tens: { [key: number]: string } = {
    2: 'عشرين', 3: 'ثلاثين', 4: 'ربعين', 5: 'خمسين',
    6: 'ستين', 7: 'سبعين', 8: 'ثمانين', 9: 'تسعين'
};
/**
 * Maps hundreds to their Algerian Arabic names.
 */
export const hundreds: { [key: number]: string } = {
    1: 'مية', 2: 'متين', 3: 'ثلاثمية', 4: 'ربعمية', 5: 'خمسمية',
    6: 'ستمية', 7: 'سبعمية', 8: 'ثمنمية', 9: 'تسعمية'
};
/**
 * Converts a number up to 999 into its colloquial Algerian Arabic text representation.
 */
export function convertThreeDigits(num: number): string {
    if (num === 0) return '';
    let str = '';
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    if (h > 0) {
        str += hundreds[h];
    }
    if (remainder > 0) {
        if (h > 0) str += ' و ';
        if (remainder >= 10 && remainder < 20) {
            str += teens[remainder];
        } else {
            const t = Math.floor(remainder / 10);
            const o = remainder % 10;
            if (o > 0) str += ones[o];
            if (t > 0) {
                if (o > 0) str += ' و ';
                str += tens[t];
            }
        }
    }
    return str;
}
/**
 * The main function to convert a Dinar amount to Algerian text.
 */
export function toAlgerianText(amount: number): string {
    if (isNaN(amount) || amount < 0) return "الرجاء إدخال رقم صحيح وموجب.";
    if (amount === 0) return 'زيرو';
    if (amount < 10) {
        const dinarPart = Math.floor(amount);
        const centimePart = Math.round((amount - dinarPart) * 100);
        let result = '';
        if (dinarPart > 0) result = `${ones[dinarPart]} دينار`;
        if (centimePart > 0) {
            if (result) result += ' و ';
            result += centimePart % 100 === 0 ? `${hundreds[centimePart / 100]}` : `${convertThreeDigits(centimePart)}`;
        }
        return result || 'زيرو';
    }
    const num = Math.round(amount * 100);
    if (num < 1000) return convertThreeDigits(num);
    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;
    let result: string[] = [];
    if (billions > 0) {
        if (billions === 1) result.push('مليار');
        else if (billions === 2) result.push('زوج ملاير');
        else result.push(`${convertThreeDigits(billions)} ملاير`);
    }
    if (millions > 0) {
        if (millions === 1) result.push('مليون');
        else if (millions === 2) result.push('زوج ملاين');
        else result.push(`${convertThreeDigits(millions)} ملاين`);
    }
    if (thousands > 0) {
        if (thousands === 1) result.push('ألف');
        else if (thousands === 2) result.push('ألفين');
        else result.push(`${convertThreeDigits(thousands)} ألف`);
    }
    if (remainder > 0) result.push(convertThreeDigits(remainder));
    return result.join(' و ');
}
/* -------------------------------------------------------------------------- */
/* MUI Theme & Utilities                                                      */
/* -------------------------------------------------------------------------- */
const muiTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#5c6ac4' },
        secondary: { main: '#E4E5E7' },
        background: { default: '#F6F6F7', paper: '#FFFFFF' },
        text: { primary: '#202223', secondary: '#6D7175' },
        divider: '#DFE3E8',
        success: { main: '#008060' },
        error: { main: '#d82c0d' },
    },
    typography: { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif' },
    shape: { borderRadius: 8 },
});

const hexToRgb = (hex: string) => { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null; };
const hslToRgb = (h: number, s: number, l: number) => { s /= 100; l /= 100; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; let r = 0, g = 0, b = 0; if (0 <= h && h < 60) { r = c; g = x; b = 0; } else if (60 <= h && h < 120) { r = x; g = c; b = 0; } else if (120 <= h && h < 180) { r = 0; g = c; b = x; } else if (180 <= h && h < 240) { r = 0; g = x; b = c; } else if (240 <= h && h < 300) { r = x; g = 0; b = c; } else if (300 <= h && h < 360) { r = c; g = 0; b = x; } r = Math.round((r + m) * 255); g = Math.round((g + m) * 255); b = Math.round((b + m) * 255); return { r, g, b }; };
const rgbToHex = (r: number, g: number, b: number) => '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
const rgbToHsl = (r: number, g: number, b: number) => { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s, l = (max + min) / 2; if (max === min) { h = s = 0; } else { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; } h /= 6; } return { h: h * 360, s: s * 100, l: l * 100 }; };
const cleanUrl = (raw: string) => raw ? raw.replace(/<url[^>]*>(.*?)<\/url>/gi, '$1').trim() : '';
const safeColor = (c: any): string => (typeof c === 'string' && (c.startsWith('#') || c.startsWith('linear-gradient')) ? c : '#5c6ac4');

const isColorLight = (hex: string): boolean => {
    // Check if hex is a valid string and starts with '#'
    if (typeof hex !== 'string' || !hex.startsWith('#')) {
        // Return true for gradients, invalid values, or undefined colors.
        // This assumes a light text color is a safer default.
        return true;
    }
    const rgb = hexToRgb(hex);
    if (!rgb) return true;
    // Calculate luminance to determine brightness
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    return luminance > 140; // Threshold for considering a color "light"
};
/* -------------------------------------------------------------------------- */
/* InlineColorPicker (MUI Component)                                          */
/* -------------------------------------------------------------------------- */
const InlineColorPicker: React.FC<{
    anchorEl: HTMLElement | null;
    onClose: () => void;
    initialColor: string;
    onColorChange: (newColor: string) => void;
    enableGradient?: boolean;
}> = ({ anchorEl, onClose, initialColor, onColorChange, enableGradient = false }) => {
    const [tab, setTab] = useState('color');
    const [hexColor, setHexColor] = useState('#ffffff');
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [lightness, setLightness] = useState(100);
    const [gradientStart, setGradientStart] = useState('#6366F1');
    const [gradientEnd, setGradientEnd] = useState('#764ba2');
    const [gradientAngle, setGradientAngle] = useState(135);

    useEffect(() => {
        const safeInitialColor = safeColor(initialColor);
        if (safeInitialColor && safeInitialColor.startsWith('linear-gradient')) {
            const parts = safeInitialColor.match(/linear-gradient\((\d+)deg, (.*), (.*)\)/);
            if (parts) { setTab('gradient'); setGradientAngle(parseInt(parts[1], 10)); setGradientStart(parts[2].trim()); setGradientEnd(parts[3].trim()); }
        } else {
            setTab('color');
            const rgb = hexToRgb(safeInitialColor || '#FFFFFF');
            if (rgb) {
                const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                setHexColor(safeInitialColor || '#FFFFFF');
                setHue(hsl.h); setSaturation(hsl.s); setLightness(hsl.l);
            }
        }
    }, [initialColor]);

    const updateColor = useCallback((newHex: string) => {
        setHexColor(newHex);
        onColorChange(newHex);
        const rgb = hexToRgb(newHex);
        if (rgb) {
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            setHue(hsl.h); setSaturation(hsl.s); setLightness(hsl.l);
        }
    }, [onColorChange]);

    const updateGradient = useCallback(() => {
        onColorChange(`linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`);
    }, [gradientAngle, gradientStart, gradientEnd, onColorChange]);

    useEffect(() => { if (tab === 'gradient') updateGradient(); }, [gradientStart, gradientEnd, gradientAngle, tab, updateGradient]);

    const handleColorAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newSaturation = Math.min(100, Math.max(0, (x / rect.width) * 100));
        const newLightness = Math.min(100, Math.max(0, 100 - (y / rect.height) * 100));
        setSaturation(newSaturation); setLightness(newLightness);
        const rgb = hslToRgb(hue, newSaturation, newLightness);
        updateColor(rgbToHex(rgb.r, rgb.g, rgb.b));
    };

    const handleHueChange = useCallback((_e: Event, newValue: number | number[]) => {
        const newHue = Array.isArray(newValue) ? newValue[0] : newValue;
        setHue(newHue);
        const rgb = hslToRgb(newHue, saturation, lightness);
        updateColor(rgbToHex(rgb.r, rgb.g, rgb.b));
    }, [saturation, lightness, updateColor]);

    return (
        <MuiPopover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
            <MuiBox sx={{ width: 280, p: 2, bgcolor: 'background.paper' }}>
                {enableGradient && (
                    <MuiBox sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <MuiStack direction="row" spacing={1}>
                            <MuiButton size="small" fullWidth variant={tab === 'color' ? 'contained' : 'text'} onClick={() => setTab('color')}>Color</MuiButton>
                            <MuiButton size="small" fullWidth variant={tab === 'gradient' ? 'contained' : 'text'} onClick={() => setTab('gradient')}>Gradient</MuiButton>
                        </MuiStack>
                    </MuiBox>
                )}
                {tab === 'color' && (
                    <MuiStack spacing={2}>
                        <MuiBox onClick={handleColorAreaClick} sx={{ position: 'relative', height: 150, width: '100%', borderRadius: 1, cursor: 'crosshair', background: `hsl(${hue}, 100%, 50%)` }}>
                            <MuiBox sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, white, transparent)' }} />
                            <MuiBox sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, black, transparent)' }} />
                            <MuiBox sx={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.5)', transform: 'translate(-50%, -50%)', left: `${saturation}%`, top: `${100 - lightness}%` }} />
                        </MuiBox>
                        <MuiSlider value={hue} onChange={handleHueChange} min={0} max={360} sx={{ '& .MuiSlider-rail, & .MuiSlider-track': { backgroundImage: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)', border: 'none', opacity: 1 }, padding: '13px 0 !important' }} />
                        <MuiStack direction="row" spacing={1} alignItems="center">
                            <MuiBox sx={{ bgcolor: hexColor, width: 28, height: 28, border: '1px solid #ccc', borderRadius: 1 }} />
                            <MuiTextField fullWidth label="HEX" value={hexColor.toUpperCase()} onChange={(e) => updateColor(e.target.value)} size="small" variant="outlined" />
                        </MuiStack>
                    </MuiStack>
                )}
                {tab === 'gradient' && (
                    <MuiStack spacing={2}>
                        <MuiTextField fullWidth label="Start Color" value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><MuiBox sx={{ width: 20, height: 20, bgcolor: gradientStart, borderRadius: 1 }} /></InputAdornment> }} />
                        <MuiTextField fullWidth label="End Color" value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><MuiBox sx={{ width: 20, height: 20, bgcolor: gradientEnd, borderRadius: 1 }} /></InputAdornment> }} />
                        <Typography variant="body2" color="text.secondary">Angle: {gradientAngle}°</Typography>
                        <MuiSlider value={gradientAngle} onChange={(_e, v) => setGradientAngle(v as number)} min={0} max={360} />
                    </MuiStack>
                )}
                <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}><Close /></IconButton>
            </MuiBox>
        </MuiPopover>
    );
};


/* -------------------------------------------------------------------------- */
/* Initial State (Moved outside component for loader default)                 */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* Initial State (Moved outside component for loader default)                 */
/* -------------------------------------------------------------------------- */
const initialFormFields: FormField[] = [
    // Header section
  
    
    // Order information
    { id: 'order-summary', type: 'summary', enabled: true, editable: false, label: 'Order summary', settings: {} },
    
    // Shipping address section
    {
        id: 'shipping-address-title',
        type: 'section-header',
        enabled: true,
        editable: false,
        label: 'Enter your shipping address',
        settings: {
            text: 'Enter your shipping address',
            alignment: 'left',
            fontSize: 18,
            fontWeight: 'bold',
            textColor: '#000000'
        }
    },
    
    // Full name field (combined first/last name)
    { 
        id: 'full-name', 
        type: 'custom-text-input', 
        enabled: true, 
        editable: false, 
        required: true, 
        label: 'Full name', 
        settings: { 
            label: 'Full name', 
            placeholder: 'Enter your full name', 
            required: true, 
            showIcon: true,
            connectTo: 'nothing' 
        } 
    },
    
    // Phone number
    { id: 'phone', type: 'phone', enabled: true, editable: false, required: true, label: 'Phone number', settings: { label: 'Phone number', placeholder: 'e.g., 0512345678', required: true, showIcon: true, invalidPhoneErrorText: 'Please enter a valid phone number.' } },
    
    // Address
    // ADD THE NEW WILAYA FIELD HERE
    {
        id: 'wilaya',
        type: 'wilaya',
        enabled: true,
        editable: false,
        required: true,
        label: 'Wilaya',
        settings: {
            label: 'Wilaya',
            required: true,
        },
    },

    // ADD THE NEW COMMUNE FIELD HERE
    {
        id: 'commune',
        type: 'commune',
        enabled: true,
        editable: false,
        required: true,
        label: 'Commune',
        settings: {
            label: 'Commune',
            required: true,
        },
    },

    // The address field should come AFTER wilaya and commune
    { id: 'address', type: 'address', enabled: true, editable: false, required: true, label: 'Address', settings: { label: 'Address', placeholder: 'Street and house number', required: true, showIcon: true } },

    // UPDATE the existing 'shipping-rates' field
    {
    id: 'shipping-rates',
    type: 'shipping-rates',
    enabled: true,
    editable: false,
    label: 'Shipping rates',
    settings: {
        title: 'Shipping rates',
        freeText: 'Free',
        enableCompanySelection: false,
        companySelectionMode: 'dropdown',
        deliveryTypeMode: 'both',
        defaultDeliveryType: 'home',
        selectedDeliveryCompanies: [],
        selectWilayaPrompt: 'Please select a Wilaya to see available shipping options.'
    } as unknown as ShippingRatesSettings,
},
    
    // Totals summary
    { id: 'totals-summary', type: 'totals-summary', enabled: true, editable: false, label: 'Totals summary', settings: { subtotalTitle: 'Subtotal', shippingTitle: 'Shipping', totalTitle: 'Total', showTaxesMessage: false, backgroundColor: '#f9fafb' } },
    
    // Complete order button
    {
        id: 'submit',
        type: 'submit',
        enabled: true,
        editable: false,
        label: 'COMPLETE ORDER - {order_total}',
        settings: {
            buttonText: 'COMPLETE ORDER - {order_total}',
            buttonSubtitle: '',
            animation: 'none',
            icon: 'none',
            backgroundColor: '#5c6ac4',
            textColor: '#FFFFFF',
            fontSize: 16,
            borderRadius: 8,
            borderWidth: 0,
            borderColor: '#5c6ac4',
            shadow: 2,
            layout: 'full-width'
        }
    },
     {
      id: 'custom-icon-feature',
      type: 'custom-icon-feature',
      enabled: true,
      editable: false,
      label: 'Trust Badges',
      settings: {
        title: 'Our Guarantees',
        titlePosition: 'top',
        features: [
          {
            enabled: true,
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/11628/11628524.png',
            caption: 'Cash on Delivery',
          },
          {
            enabled: true,
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/1670/1670965.png',
            caption: 'Fast Delivery',
          },
          {
            enabled: true,
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/9368/9368849.png',
            caption: '24/7 Support',
          },
        ],
        layout: 'auto',
      } as CustomIconFeatureSettings,
    },
    // Logistics delivery (hidden configuration field)
   {
    id: 'logistics-delivery-singleton',
    type: 'logistics-delivery',
    enabled: true,
    editable: false,
    label: 'Logistics & Delivery',
    settings: {
        title: 'Select Delivery Company',
        apiProvider: 'manual',
        apiToken: '',
        userGuid: '',
        apiUrl: '',
        apiKey: '',
        showWilayaNumbers: true, // <--- ADD THIS LINE
        showStopDesk: true,
        showHomeDelivery: true,
        defaultDeliveryType: 'home',
        algeriaWilayaMode: 'arabic',
        algeriaCommuneMode: 'french',
        manualRates: [],
        hiddenWilayas: [],
        enableCompanySelection: false,
        visibleCompanies: [],
        companySelectionMode: 'dropdown',
        allowCompanyOverride: false,
        deliveryTypeMode: 'both',
        showWilayaField: true,
        showCommuneField: true,
        wilayaFieldLabel: 'Wilaya',
        communeFieldLabel: 'Commune',
        showManualRates: true,
    } as LogisticsDeliverySettings,
}
];

const initialFormStyle: FormStyle = {
    textColor: '#202223',
    fontSize: 14,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe3e8',
    shadow: 1,
    hideFieldLabels: false,
    enableRTL: false,
    hideCloseButton: false,
    enableFullScreenMobile: true,
   title: '', // <--- Changed from 'CASH ON DELIVERY'
    description: '', // <--- Changed from its previous value
    layout: 'single',
    primaryColor: '#5c6ac4',
    enableDinarConverter: true,
    currencySymbol: 'دج',
    popupButtonSettings: {
        buttonText: 'Open Form',
        backgroundColor: '#6366f1',
        textColor: '#ffffff',
        fontSize: 16,
        borderRadius: 12,
        borderWidth: 0,
        borderColor: '#6366f1',
        shadow: 2,
        animation: 'none',
        placement: 'center',
        followUser: false,
    },
};

const getLocalizedText = (key: string, language: 'arabic' | 'french' = 'arabic') => {
    const translations: { [key: string]: { arabic: string; french: string; } } = {
        'Knitted Throw Pillows': {
            arabic: 'Knitted Throw Pillows',
            french: 'Coussins Tricotés'
        }
    };
    
    return translations[key]?.[language] || key;
};

const initialShippingRates: ShippingRate[] = [{ id: `rate-${Date.now()}`, name: 'Free shipping', price: 0, description: 'No condition, always visible.', conditions: [] }];


// ADD The Loader
export const loader = async (args: LoaderFunctionArgs) => {
    // This now passes the full 'args' object which includes the context
    const { session } = await authenticate.admin(args);
    const { request } = args; // Destructure request after auth

    const language = await getLanguageFromRequest(request, session.id); // Pass session.id
    const translations = await getTranslations(language);
    const rtl = isRTL(language);
    
    const settings = await db.shopSettings.findUnique({
        where: { shopId: session.shop },
    });

    // --- Robustly load formFields ---
    let loadedFormFields = initialFormFields;
    try {
        if (settings?.formFields) {
            const parsedFields = JSON.parse(settings.formFields as string);
            if (Array.isArray(parsedFields) && parsedFields.length > 0) {
                loadedFormFields = parsedFields;
            }
        }
    } catch (e) {
        console.error("Could not parse formFields, using default.");
    }

    // --- Robustly load formStyle ---
    let loadedFormStyle = initialFormStyle;
    try {
        if (settings?.formStyle) {
            const parsedStyle = JSON.parse(settings.formStyle as string);
            // Check if it's a non-empty object before using it
            if (parsedStyle && typeof parsedStyle === 'object' && Object.keys(parsedStyle).length > 0) {
                // Merge with initial state to fill in any missing properties from old saves
                loadedFormStyle = { ...initialFormStyle, ...parsedStyle };
            }
        }
    } catch (e) {
        console.error("Could not parse formStyle, using default.");
    }

    // --- Robustly load shippingRates ---
    let loadedShippingRates = initialShippingRates;
    try {
        if (settings?.shippingRates) {
            const parsedRates = JSON.parse(settings.shippingRates as string);
            if (Array.isArray(parsedRates) && parsedRates.length > 0) {
                loadedShippingRates = parsedRates;
            }
        }
    } catch (e) {
        console.error("Could not parse shippingRates, using default.");
    }

    return json({
        formFields: loadedFormFields,
        formStyle: loadedFormStyle,
        shippingRates: loadedShippingRates,
        language,
        translations,
        rtl,
    });
};

// ADD The Action
// Updated action function for app/routes/app.cod-form-designer.tsx

// inside app/routes/app.form-designer.tsx
function safeParse(value: string | null | undefined, fallback: any) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
} 
// in app/routes/app.form-designer.tsx

export const action = async (args: ActionFunctionArgs) => {
  console.log("✅ [ACTION] - Received a request.");

  try {
    // 1. Authenticate using the full 'args' object
    console.log("Step 1: Attempting authentication...");
    const { session, admin } = await authenticate.admin(args);
    console.log("Step 1 SUCCESS: Admin authenticated for shop:", session.shop);

    const { request } = args; // Destructure request after auth

    // Read the JSON body from the authenticatedFetch request
    const requestBody = await request.json();

    const formFields = requestBody.formFields as string;
    const formStyle = requestBody.formStyle as string;
    const shippingRates = requestBody.shippingRates as string;

    // Validate required data
    if (!formFields || !formStyle) {
      console.error("❌ [ACTION] - Missing required form data");
      return json({ success: false, error: "Missing required form data" }, { status: 400 });
    }

    console.log("Step 2: Validating and parsing data...");
    
    // Validate JSON data
    try {
      JSON.parse(formFields);
      JSON.parse(formStyle);
      if (shippingRates) JSON.parse(shippingRates);
    } catch (parseError) {
      console.error("❌ [ACTION] - Invalid JSON data:", parseError);
      return json({ success: false, error: "Invalid form data format" }, { status: 400 });
    }

    const dataToUpdate = { formFields, formStyle, shippingRates };

    console.log("Step 3: Upserting data to database...");
    await db.shopSettings.upsert({
      where: { shopId: session.shop },
      update: dataToUpdate,
      create: {
        shopId: session.shop,
        formFields,
        formStyle,
        shippingRates: shippingRates || "[]",
      },
    });
    console.log("Step 3 SUCCESS: Database upsert complete.");

    // ✅ VERIFICATION: Check if database save actually worked
    console.log("Step 3.1: Verifying database save...");
    const savedRecord = await db.shopSettings.findUnique({
      where: { shopId: session.shop }
    });
    
    if (!savedRecord) {
      console.error("❌ VERIFICATION FAILED: Database record not found after upsert");
      return json({ success: false, error: "Database save verification failed" }, { status: 500 });
    }
    
    console.log("✅ VERIFICATION SUCCESS: Database record confirmed saved");

    console.log("Step 4: Fetching shop GID via GraphQL...");
    const shopIdQueryResponse = await admin.graphql("query { shop { id } }");
    const shopIdQueryResult = await shopIdQueryResponse.json();
    const shopGid = shopIdQueryResult.data?.shop?.id;
    console.log("Step 4 SUCCESS: Fetched shop GID:", shopGid);

    if (!shopGid) throw new Error("Could not retrieve shop GID.");

    const fullConfigForStorefront: any = {
      formFields: safeParse(formFields, []),
      formStyle: safeParse(formStyle, {}),
      shippingRates: safeParse(shippingRates, []),
      lastUpdated: new Date().toISOString(),
    };

    // ✅ FIX: ADDING THE SUBMIT URL TO THE CONFIG OBJECT
    fullConfigForStorefront.submitUrl = `https://${session.shop}/apps/proxy/submit`;

    const jsonPayload = JSON.stringify(fullConfigForStorefront);
    console.log(`Step 5: Setting shop metafield. Payload size: ${jsonPayload.length} bytes.`);

    const metafieldResponse = await admin.graphql(
      "mutation SetShopMetafield($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { metafields { id key namespace } userErrors { field message } } }",
      {
        variables: {
          metafields: [
            {
              ownerId: shopGid,
              namespace: "easycod_dz",
              key: "form_config",
              type: "json",
              value: jsonPayload,
            },
          ],
        },
      }
    );
    console.log("Step 5 SUCCESS: GraphQL mutation sent.");

    const result = await metafieldResponse.json();
    const userErrors = result.data?.metafieldsSet?.userErrors;

    if (userErrors && userErrors.length > 0) {
      console.error("❌ METAFIELD SAVE FAILED (User Errors):", userErrors);
      return json({ success: false, error: userErrors.map((e: any) => e.message).join(", ") }, { status: 400 });
    }

    // ✅ VERIFICATION: Check if metafield save actually worked
    console.log("Step 5.1: Verifying metafield save...");
    const savedMetafield = result.data?.metafieldsSet?.metafields?.[0];
    
    if (!savedMetafield) {
      console.error("❌ VERIFICATION FAILED: Metafield not found in response");
      console.error("Full metafield response:", JSON.stringify(result, null, 2));
      return json({ success: false, error: "Metafield save verification failed" }, { status: 500 });
    }
    
    console.log("✅ VERIFICATION SUCCESS: Metafield confirmed saved with ID:", savedMetafield.id);

    console.log("✅ [ACTION] - Successfully completed and sending response.");
    return json({
      success: true,
      metafield: savedMetafield,
    });

  } catch (error) {
    console.error("❌ ACTION FAILED UNEXPECTEDLY (Catch Block)");
    console.error("Error type:", typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace available');
    console.error("Full error object:", error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      details: "An unexpected error occurred during save operation"
    }, { status: 500 });
  }
};



/* -------------------------------------------------------------------------- */
/* ColorSwatch Component                                                      */
/* -------------------------------------------------------------------------- */
const ColorSwatch: React.FC<{ color: string }> = ({ color }) => (
    <div
        style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: color,
            border: '1px solid #E1E3E5',
        }}
    />
);

/* -------------------------------------------------------------------------- */
/* Stable EditorColorField Component (Moved from FieldSettingsEditor)         */
/* -------------------------------------------------------------------------- */
const EditorColorField: React.FC<{
    label: string;
    settingKey: string;
    color: string;
    fieldSettings: any;
    onUpdate: (c: string) => void;
    ColorPickerTrigger: React.FC<{
        settingKey: string;
        label: string;
        enableGradient?: boolean;
        getSettings: () => any;
        onUpdate?: (value: string) => void;
    }>;
    enableGradient?: boolean;
}> = ({ label, settingKey, color, fieldSettings, onUpdate, ColorPickerTrigger, enableGradient }) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (triggerRef.current?.firstChild) {
            (triggerRef.current.firstChild as HTMLElement).click();
        }
    };

    return (
        <div style={{ marginBottom: '12px' }}>
            <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">{label}</Text>
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer' }}
                onClick={handleClick}
            >
                <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: color, border: '1px solid #ccc' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#5c5f62' }}>{color}</span>
                <div ref={triggerRef} style={{ opacity: 0, position: 'absolute', zIndex: -1, pointerEvents: 'none' }}>
                    <ColorPickerTrigger
                        getSettings={() => fieldSettings}
                        onUpdate={onUpdate}
                        settingKey={settingKey}
                        label={label}
                        enableGradient={enableGradient}
                    />
                </div>
            </div>
        </div>
    );
};


/* -------------------------------------------------------------------------- */
/* FieldSettingsEditor (Hybrid Component)                                     */
/* -------------------------------------------------------------------------- */
const FieldSettingsEditor: React.FC<{
    field: FormField;
    onSettingsChange: (fieldId: string, newSettings: Partial<AllFieldSettings>) => void;
    ColorPickerTrigger: React.FC<{ settingKey: string; label: string; enableGradient?: boolean; getSettings: () => any; onUpdate?: (value: string) => void; }>;
    allFormFields: FormField[];
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    allWilayas: AlgeriaLocation[];
    shippingRates: ShippingRate[]; // 👈 ADD THIS LINE
    isEditingPopupButton: boolean; 
}> = ({ field, onSettingsChange, ColorPickerTrigger, allFormFields, setFormValues, allWilayas, shippingRates }) => {
    const s = field.settings as any;

    const handleFieldChange = useCallback((value: string, id: string) => {
        onSettingsChange(field.id, { [id]: value });
    }, [onSettingsChange, field.id]);

    const handleCheckboxChange = useCallback((checked: boolean, id: string) => {
        onSettingsChange(field.id, { [id]: checked });
    }, [onSettingsChange, field.id]);
    
    const handleNumericFieldChange = useCallback((value: string, id: string) => {
        onSettingsChange(field.id, { [id]: Number(value) });
    }, [onSettingsChange, field.id]);

    const handleFeatureChange = useCallback((index: number, key: keyof IconFeature, value: string | boolean) => {
        const currentSettings = field.settings as CustomIconFeatureSettings;
        const newFeatures = [...currentSettings.features];
        newFeatures[index] = { ...newFeatures[index], [key]: value };
        onSettingsChange(field.id, { features: newFeatures });
    }, [field.id, field.settings, onSettingsChange]);

    const handleRangeSliderChange = useCallback((value: RangeSliderValue, id: string) => {
        onSettingsChange(field.id, { [id]: typeof value === 'number' ? value : value[0] });
    }, [onSettingsChange, field.id]);

const handleMultiSelectChange = useCallback((companies: string[]) => {
        onSettingsChange(field.id, { selectedDeliveryCompanies: companies });
    }, [onSettingsChange, field.id]);

    const layoutOverrideEditor = !new Set([
        'header', 'section-header', 'summary', 'totals-summary',
        'submit', 'custom-link-button', 'custom-whatsapp-button',
        'shopify-checkout-button', 'custom-image', 'logistics-delivery'
    ]).has(field.type) && (
            <Select
                label="Field layout override"
                options={[
                    { label: 'Use form default', value: 'default' },
                    { label: 'Single column (full width)', value: 'single' },
                ]}
                id="layoutOverride"
                value={(field.settings as any).layoutOverride || 'default'}
                onChange={handleFieldChange}
                helpText="Overrides the global 'Two columns' layout for just this field."
            />
        );

const renderCommonTextFields = (options: { hasPrefix?: boolean; hasIcon?: boolean } = {}) => (
    <BlockStack gap="400">
        {layoutOverrideEditor}
        <TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" />
        <TextField id="placeholder" label="Placeholder" value={s.placeholder || ''} onChange={handleFieldChange} autoComplete="off" />
        {options.hasIcon && (
            <>
                {field.type === 'phone' && <Checkbox label="Show field icon" id="showIcon" checked={s.showIcon || false} onChange={handleCheckboxChange} />}
                {(field.type === 'address' || field.type === 'address2' || field.type === 'province' || field.type === 'zip-code') &&
                    <Checkbox label="Show field icon" id="showIcon" checked={s.showIcon || false} onChange={handleCheckboxChange} />}
                {(field.type === 'first-name' || field.type === 'last-name') &&
                    <Checkbox label="Show field icon" id="showIcon" checked={s.showIcon || false} onChange={handleCheckboxChange} />}
                {field.type === 'custom-password-field' &&
                    <Checkbox label="Show field icon" id="showIcon" checked={s.showIcon || false} onChange={handleCheckboxChange} />}
                {(field.type === 'email' || field.type === 'custom-text-input') &&
                    <Checkbox label="Show field icon" id="showIcon" checked={s.showIcon || false} onChange={handleCheckboxChange} />}
            </>
        )}
        <Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} />
            <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                    <TextField type="number" id="minLength" label="Min length" value={String(s.minLength || '')} onChange={handleNumericFieldChange} autoComplete="off" />
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                    <TextField type="number" id="maxLength" label="Max length" value={String(s.maxLength || '')} onChange={handleNumericFieldChange} autoComplete="off" />
                </Grid.Cell>
            </Grid>
            {options.hasPrefix && <TextField id="prefixText" label="Prefix text" value={s.prefixText || ''} onChange={handleFieldChange} helpText="Text that your customers can't change." autoComplete="off" />}
            <TextField
                id="invalidValueError"
                label="Invalid value error text"
                value={s.invalidValueError || ''}
                onChange={handleFieldChange}
                helpText="Leave empty to use the generic error."
                autoComplete="off"
            />
        </BlockStack>
    );

    const renderButtonSettings = (opts: { hideDiscountType?: boolean } = {}) => (
        <BlockStack gap="400">
            {!opts.hideDiscountType && (s.discountType !== undefined) && (
                <>
                    <Select
                        id="discountType"
                        label="Discount type"
                        options={[{ label: 'No discount', value: 'none' }, { label: 'Fixed value', value: 'fixed_value' }, { label: 'Percentage', value: 'percentage' }]}
                        value={s.discountType || 'none'}
                        onChange={handleFieldChange}
                    />
                    {s.discountType !== 'none' && (
                        <TextField
                            id="discountValue" label="Discount value" type="number" value={String(s.discountValue ?? '')} onChange={handleNumericFieldChange}
                            suffix={s.discountType === 'percentage' ? '%' : 'DZD'} autoComplete="off"
                        />
                    )}
                </>
            )}

            <Select
                id="layout"
                label="Button Layout"
                options={[
                    { label: 'Full Width', value: 'full-width' },
                    { label: 'Half Width (Left)', value: 'half-left' },
                    { label: 'Half Width (Right)', value: 'half-right' },
                ]}
                value={(s as ButtonSettings).layout || 'full-width'}
                onChange={(value) => handleFieldChange(value, 'layout')}
                helpText="Use 'Half Width' to place two buttons side-by-side. Ensure they are adjacent."
            />

            <TextField id="buttonText" label="Button text" value={s.buttonText || ''} onChange={handleFieldChange} helpText="Use {order_total} or {order_subtotal}" autoComplete="off" />
            <TextField id="buttonSubtitle" label="Button subtitle" value={s.buttonSubtitle || ''} onChange={handleFieldChange} autoComplete="off" />
            <Select
                id="animation" label="Button animation"
                options={[
                    { label: 'None', value: 'none' }, { label: 'Shaker', value: 'shaker' }, { label: 'Bounce', value: 'bounce' },
                    { label: 'Pulse', value: 'pulse' }, { label: 'Wobble', value: 'wobble' }, { label: 'Glitch Text', value: 'glitch-text' },
                    { label: 'Neon Pulse', value: 'neon-pulse' }, { label: 'Border Reveal', value: 'border-reveal' }, { label: '3D Plane Rotate', value: 'rotate-3d-plane' },
                    { label: 'Gradient Wave', value: 'gradient-wave' }, { label: 'Money Rain', value: 'money-rain' }, { label: 'Heartbeat', value: 'heartbeat' },
                    { label: 'Flash Glow', value: 'flash-glow' }, { label: 'Typing Effect', value: 'typing-effect' }, { label: 'Coin Flip', value: 'coin-flip' },
                    { label: 'Cash Magnet', value: 'cash-magnet' }, { label: 'Order Processing', value: 'order-processing' }
                ]}
                value={s.animation || 'none'} onChange={handleFieldChange}
            />
            <EditorColorField label="Background color" settingKey="backgroundColor" color={s.backgroundColor} onUpdate={(c) => onSettingsChange(field.id, { backgroundColor: c })} enableGradient fieldSettings={s} ColorPickerTrigger={ColorPickerTrigger} />
            <EditorColorField label="Text color" settingKey="textColor" color={s.textColor} onUpdate={(c) => onSettingsChange(field.id, { textColor: c })} fieldSettings={s} ColorPickerTrigger={ColorPickerTrigger} />
            <EditorColorField label="Border color" settingKey="borderColor" color={s.borderColor} onUpdate={(c) => onSettingsChange(field.id, { borderColor: c })} fieldSettings={s} ColorPickerTrigger={ColorPickerTrigger} />
            <RangeSlider label={`Font size: ${s.fontSize || 16}px`} value={s.fontSize || 16} onChange={(v) => handleRangeSliderChange(v, 'fontSize')} min={10} max={30} output />
            <RangeSlider label={`Border radius: ${s.borderRadius ?? 8}px`} value={s.borderRadius ?? 8} onChange={(v) => handleRangeSliderChange(v, 'borderRadius')} min={0} max={50} output />
            <RangeSlider label={`Border width: ${s.borderWidth ?? 0}px`} value={s.borderWidth ?? 0} onChange={(v) => handleRangeSliderChange(v, 'borderWidth')} min={0} max={10} output />
            <RangeSlider label={`Shadow: ${s.shadow || 2}`} value={s.shadow || 2} onChange={(v) => handleRangeSliderChange(v, 'shadow')} min={0} max={24} output />
        </BlockStack>
    );

    const getEditorContent = () => {
        const connectOptions = [
            { label: 'Nothing', value: 'nothing' }, { label: 'Address', value: 'address' },
            { label: 'Address 2', value: 'address_2' }, { label: 'Province', value: 'province' },
            { label: 'City', value: 'city' }, { label: 'Zip code', value: 'zip_code' },
            { label: 'Company name', value: 'company_name' }
        ];

        switch (field.type) {
            
            case 'totals-summary': return <BlockStack gap="400">
                <Text variant="headingMd" as="h3">TOTALS SUMMARY</Text>
                <TextField id="subtotalTitle" label="Subtotal title" value={s.subtotalTitle} onChange={handleFieldChange} autoComplete="off" />
                <TextField id="shippingTitle" label="Shipping title" value={s.shippingTitle} onChange={handleFieldChange} autoComplete="off" />
                <TextField id="totalTitle" label="Total title" value={s.totalTitle} onChange={handleFieldChange} autoComplete="off" />
                <EditorColorField label="Background color" settingKey="backgroundColor" color={s.backgroundColor} onUpdate={(c) => onSettingsChange(field.id, { backgroundColor: c })} fieldSettings={s} ColorPickerTrigger={ColorPickerTrigger} />
            </BlockStack>;
            
    case 'shipping-rates': {
    const s = field.settings as ShippingRatesSettings;
    const logisticsField = allFormFields.find((f: FormField) => f.type === 'logistics-delivery');
    const logisticsSettings = logisticsField?.settings as LogisticsDeliverySettings | undefined;

    // FIX: Check for ANY available rates (imported or manual)
    const hasAnyRates = (logisticsSettings?.manualRates && logisticsSettings.manualRates.length > 0) || (shippingRates && shippingRates.length > 0);

    // FIX: Correctly determine available companies from BOTH sources
    const availableCompanies = useMemo(() => {
        const companies = new Set<string>();
        if (logisticsSettings?.manualRates) {
            logisticsSettings.manualRates.forEach(rate => {
                if (rate.apiProvider) companies.add(rate.apiProvider);
            });
        }
        // If there are any truly manual rates, add "manual" as a selectable option
        if (shippingRates && shippingRates.length > 0) {
            companies.add('manual');
        }
        return Array.from(companies);
    }, [logisticsSettings?.manualRates, shippingRates]);

    // FIX: Update the warning banner logic
    if (!hasAnyRates) {
        return (
            <Banner tone="warning">
                <p>No shipping rates have been configured. Please add manual rates in the <strong>Shipping Rates</strong> tab or import rates via the <strong>Logistics Configuration</strong>.</p>
            </Banner>
        );
    }

    return (
        <BlockStack gap="400">
            <Text variant="headingMd" as="h3">SHIPPING RATES</Text>
            
            <TextField 
                id="title" 
                label="Title" 
                value={s.title || ''} 
                onChange={handleFieldChange} 
                autoComplete="off" 
            />
            
            <TextField 
                id="freeText" 
                label="Free shipping text" 
                value={s.freeText || ''} 
                onChange={handleFieldChange} 
                autoComplete="off" 
            />
                 {/* ADD THIS FIELD: */}
            <TextField 
                id="selectWilayaPrompt" 
                label="Select Wilaya prompt text" 
                value={s.selectWilayaPrompt || 'Please select a Wilaya to see available shipping options.'} 
                onChange={handleFieldChange} 
                autoComplete="off"
                helpText="Text shown when no wilaya is selected"
            />
            {/* Company Selection Settings */}
            <Card>
                <BlockStack gap="400">
                    <Text variant="headingMd" as="h4">Delivery Company Selection</Text>
                    
                    <Checkbox 
                        id="enableCompanySelection" 
                        label="Enable company selection for customers" 
                        checked={s.enableCompanySelection || false} 
                        onChange={handleCheckboxChange} 
                    />
                    


{s.enableCompanySelection && (
    <BlockStack gap="400">
        {/* --- Manual & API Company Checklists --- */}
        {availableCompanies.includes('manual') && (
            <BlockStack gap="200">
                <Text variant="headingSm" as="h5">Manual Rates</Text>
                <ChoiceList
                    title="Manual Rates"
                    titleHidden
                    choices={[{ label: 'Enable Manual Shipping Rates', value: 'manual' }]}
                    selected={s.selectedDeliveryCompanies.filter((c: string) => c === 'manual') || []}
                    onChange={(selection) => {
                        const apiSelection = s.selectedDeliveryCompanies.filter((c: string) => c !== 'manual');
                        handleMultiSelectChange([...selection, ...apiSelection]);
                    }}
                />
                <Divider />
            </BlockStack>
        )}
        {availableCompanies.filter(c => c !== 'manual').length > 0 && (
            <BlockStack gap="200">
                <Text variant="headingSm" as="h5">Delivery Companies (from API)</Text>
                <ChoiceList
                    title="Select delivery companies to show"
                    titleHidden
                    choices={availableCompanies.filter(c => c !== 'manual').map(company => ({
                        label: company ? company.charAt(0).toUpperCase() + company.slice(1) : 'Unknown',
                        value: company
                    }))}
                    selected={s.selectedDeliveryCompanies.filter((c: string) => c !== 'manual') || []}
                    onChange={(selection) => {
                        const manualSelection = s.selectedDeliveryCompanies.filter((c: string) => c === 'manual');
                        handleMultiSelectChange([...selection, ...manualSelection]);
                    }}
                    allowMultiple
                />
            </BlockStack>
        )}

        <Divider />

        {/* --- Company Selection Mode --- */}
        <Select
            id="companySelectionMode"
            label="Company selection mode"
            options={[
                {
                    title: 'Customer Choice',
                    options: [
                        { label: 'Dropdown menu', value: 'dropdown' },
                        { label: 'Radio buttons', value: 'radio' },
                    ],
                },
                {
                    title: 'Automatic Selection',
                    options: [
                        { label: 'Always show cheapest', value: 'auto_cheapest' },
                        { label: 'Use default company', value: 'auto_default' },
                    ],
                },
            ]}
            value={s.companySelectionMode || 'dropdown'}
            onChange={(value) => handleFieldChange(value, 'companySelectionMode')}
            helpText="How customers will see and select shipping options."
        />

        {/* --- Default Company Selector (Conditional) --- */}
        {s.companySelectionMode === 'auto_default' && (
            <Select
                id="defaultCompany"
                label="Default delivery company"
                options={availableCompanies
                    .filter(c => c !== 'manual')
                    .map(company => ({
                    label: company.charAt(0).toUpperCase() + company.slice(1),
                    value: company,
                }))}
                value={logisticsSettings?.defaultCompany || ''}
                onChange={(value) => {
                    if (logisticsField) {
                        onSettingsChange(logisticsField.id, { defaultCompany: value });
                    }
                }}
                helpText="This company will be used automatically if available."
            />
        )}
    </BlockStack>
)}
                </BlockStack>
            </Card>
        </BlockStack>
    );
}     
            case 'discount-codes': return <BlockStack gap="400"><Text variant="headingMd" as="h3">DISCOUNT CODES</Text><Checkbox id="limitToOne" label="Limit to 1 discount code per order" checked={s.limitToOne} onChange={handleCheckboxChange} /><TextField id="discountsLineText" label="Discounts line text" value={s.discountsLineText} onChange={handleFieldChange} autoComplete="off" /><TextField id="discountCodeFieldLabel" label="Discount code field label" value={s.discountCodeFieldLabel} onChange={handleFieldChange} autoComplete="off" /><TextField id="applyButtonText" label="Apply button text" value={s.applyButtonText} onChange={handleFieldChange} autoComplete="off" /><EditorColorField label="Apply button background color" settingKey="applyButtonBackgroundColor" color={s.applyButtonBackgroundColor} onUpdate={(c) => onSettingsChange(field.id, { applyButtonBackgroundColor: c })} fieldSettings={s} ColorPickerTrigger={ColorPickerTrigger} /><TextField id="invalidDiscountCodeErrorText" label="Invalid discount code error text" value={s.invalidDiscountCodeErrorText} onChange={handleFieldChange} autoComplete="off" /><TextField id="oneDiscountAllowedErrorText" label="1 discount code allowed error text" value={s.oneDiscountAllowedErrorText} onChange={handleFieldChange} autoComplete="off" /></BlockStack>;
            case 'first-name': case 'last-name': case 'address': return renderCommonTextFields({ hasIcon: true });
            case 'address2': case 'province': case 'order-note': return renderCommonTextFields({ hasIcon: true });
            case 'phone': return (
                <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">PHONE FIELD</Text>
                    {layoutOverrideEditor}
                    <TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" />
                    <TextField id="placeholder" label="Placeholder" value={s.placeholder || ''} onChange={handleFieldChange} autoComplete="off" />
                    <Checkbox id="showIcon" label={<span><s-icon type="phone" size="small" /> Show field icon</span>} checked={s.showIcon || false} onChange={handleCheckboxChange} />
                    <Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} />
                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                            <TextField type="number" id="minLength" label="Min length" value={String(s.minLength || '')} onChange={handleNumericFieldChange} autoComplete="off" />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                            <TextField type="number" id="maxLength" label="Max length" value={String(s.maxLength || '')} onChange={handleNumericFieldChange} autoComplete="off" />
                        </Grid.Cell>
                    </Grid>
                    <TextField id="prefixText" label="Prefix text" value={s.prefixText || ''} onChange={handleFieldChange} helpText="Text that your customers can't change." autoComplete="off" />
                    <TextField id="invalidPhoneErrorText" label="Invalid phone error text" value={s.invalidPhoneErrorText || ''} onChange={handleFieldChange} autoComplete="off" />
                </BlockStack>
            );
            case 'city': return <BlockStack gap="400">{layoutOverrideEditor}<TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" /><TextField id="placeholder" label="Placeholder" value={s.placeholder || ''} onChange={handleFieldChange} autoComplete="off" /><Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} /><Checkbox id="disableDropdown" label="Disable dropdown" checked={s.disableDropdown || false} onChange={handleCheckboxChange} /></BlockStack>;
            case 'email': return <BlockStack gap="400">{renderCommonTextFields({ hasIcon: true })}<Checkbox id="disableValidation" label="Disable email validation" checked={s.disableValidation || false} onChange={handleCheckboxChange} /><TextField id="invalidEmailErrorText" label="Invalid email error text" value={s.invalidEmailErrorText || ''} onChange={handleFieldChange} autoComplete="off" /></BlockStack>;
            case 'subscribe': return <BlockStack gap="400">{layoutOverrideEditor}<TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" /><Checkbox id="preselect" label="Preselect checkbox" checked={s.preselect || false} onChange={handleCheckboxChange} /></BlockStack>;
            case 'terms': return <BlockStack gap="400">{layoutOverrideEditor}<TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" />
                <TextField
                    id="termsUrl"
                    label="Terms and Conditions URL"
                    value={(s as TermsSettings).termsUrl || ''}
                    onChange={handleFieldChange}
                    placeholder="https://example.com/terms"
                    autoComplete="off"
                />
                <Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} /></BlockStack>;
            case 'submit': return <BlockStack gap="400"><Text variant="headingMd" as="h3">SUBMIT BUTTON</Text>{renderButtonSettings({ hideDiscountType: true })}</BlockStack>;
            case 'header':
            case 'section-header':
            case 'custom-title': return (
                <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">CUSTOM TEXT</Text>
                    <TextField multiline={3} id="text" label="Text" value={s.text || ''}
                        onChange={handleFieldChange}
                        helpText="Shortcodes: {order_total}, {product_name}"
                        autoComplete="off" />
                    <Select id="alignment" label="Alignment"
                        options={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]}
                        value={s.alignment || 'center'}
                        onChange={handleFieldChange} />
                    <RangeSlider label={`Font size: ${s.fontSize || 16}px`}
                        value={s.fontSize || 16}
                        onChange={(v) => handleRangeSliderChange(v, 'fontSize')}
                        min={10} max={48} output />
                    <Select id="fontWeight" label="Font Weight"
                        options={[{ label: 'Normal', value: 'normal' }, { label: 'Bold', value: 'bold' }]}
                        value={s.fontWeight || 'normal'}
                        onChange={handleFieldChange} />
                    <EditorColorField
                        label="Text color"
                        settingKey="textColor"
                        color={s.textColor}
                        onUpdate={(c) => onSettingsChange(field.id, { textColor: c })}
                        fieldSettings={s}
                        ColorPickerTrigger={ColorPickerTrigger}
                    />
                </BlockStack>
            );
            case 'custom-image':
                return (
                    <BlockStack gap="400">
                        <Text variant="headingMd" as="h3">IMAGE OR GIF</Text>
                        <TextField
                            id="imageUrl"
                            label="Image URL"
                            value={s.imageUrl || ''}
                            onChange={handleFieldChange}
                            autoComplete="off"
                            helpText="Enter the direct URL to your image or GIF"
                        />
                        <RangeSlider
                            label={`Image size: ${s.imageSize || 100}%`}
                            value={s.imageSize || 100}
                            onChange={(v) => handleRangeSliderChange(v, 'imageSize')}
                            min={10}
                            max={100}
                            output
                        />
                        <TextField
                            id="aspectRatio"
                            label="Aspect Ratio"
                            value={s.aspectRatio || ''}
                            onChange={(value) => handleFieldChange(value, 'aspectRatio')}
                            helpText="Optional. Use format like 16/9 or leave empty for auto. Click suggestions below."
                            autoComplete="off"
                            placeholder="auto"
                        />
                        <LegacyStack spacing="tight">
                            <Text as="span" variant="bodySm" tone="subdued">Quick select:</Text>
                            {[
                                { ratio: 'auto', label: 'Auto' },
                                { ratio: '16/9', label: 'Widescreen' },
                                { ratio: '4/3', label: 'Standard' },
                                { ratio: '1/1', label: 'Square' },
                                { ratio: '3/2', label: 'Photo' },
                                { ratio: '2/3', label: 'Portrait' }
                            ].map(({ ratio, label }) => (
                                <Button
                                    key={ratio}
                                    size="slim"
                                    pressed={s.aspectRatio === ratio}
                                    onClick={() => handleFieldChange(ratio === 'auto' ? '' : ratio, 'aspectRatio')}
                                >
                                    {label}
                                </Button>
                            ))}
                        </LegacyStack>
                        <Select
                            id="alignment"
                            label="Image Alignment"
                            options={[
                                { label: 'Center', value: 'center' },
                                { label: 'Left', value: 'left' },
                                { label: 'Right', value: 'right' }
                            ]}
                            value={s.alignment || 'center'}
                            onChange={(value) => handleFieldChange(value, 'alignment')}
                            helpText="Position the image within the container"
                        />
                    </BlockStack>
                );

            case 'quantity-selector': {
                const s = field.settings as QuantitySelectorSettings;
                return (
                    <BlockStack gap="400">
                        <Text variant="headingMd" as="h3">QUANTITY SELECTOR</Text>
                        {layoutOverrideEditor}
                        <TextField
                            id="label"
                            label="Label"
                            value={s.label || ''}
                            onChange={handleFieldChange}
                            autoComplete="off"
                        />
                        <Select
                            id="alignment"
                            label="Alignment"
                            options={[
                                { label: 'Left', value: 'left' },
                                { label: 'Center', value: 'center' },
                                { label: 'Right', value: 'right' },
                            ]}
                            value={s.alignment || 'left'}
                            onChange={(value) => handleFieldChange(value, 'alignment')}
                        />
                    </BlockStack>
                );
            }
            case 'custom-whatsapp-button': return (
                <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">WHATSAPP BUTTON</Text>
                    <TextField
                        id="whatsappPhoneNumber"
                        label="Your WhatsApp phone number"
                        value={s.whatsappPhoneNumber || ''}
                        onChange={handleFieldChange}
                        helpText="Important: include your country code."
                        autoComplete="off"
                    />
                    <Checkbox
                        id="createOrderOnClick"
                        label="Create an order when the WhatsApp button is clicked"
                        checked={s.createOrderOnClick || false}
                        onChange={handleCheckboxChange}
                    />
                    <TextField
                        multiline={4}
                        id="prefilledMessage"
                        label="Pre-filled WhatsApp message"
                        value={s.prefilledMessage || ''}
                        onChange={handleFieldChange}
                        helpText="Shortcodes: {page_url}, {products_summary_with_quantity}, {order_total}, {full_name}, {phone}, {email}, {full_address}, {order_note}"
                        autoComplete="off"
                    />
                    {renderButtonSettings({ hideDiscountType: true })}
                </BlockStack>
            );
            case 'custom-text-input':
                return <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">TEXT INPUT</Text>
                    {renderCommonTextFields({ hasIcon: true, hasPrefix: true })}
                    <Select id="connectTo" label="Connect this field to" options={connectOptions} value={s.connectTo || 'nothing'} onChange={handleFieldChange} />
                    <Checkbox id="allowOnlyNumbers" label="Allow only numbers in this field" checked={s.allowOnlyNumbers || false} onChange={handleCheckboxChange} />
                </BlockStack>;
            case 'custom-dropdown':
                const dropdownOptions = [
                    { label: 'Nothing', value: 'nothing' }, { label: 'Address', value: 'address' }, { label: 'Address 2', value: 'address_2' },
                    { label: 'Province', value: 'province' }, { label: 'City', value: 'city' }, { label: 'Zip code', value: 'zip_code' },
                    { label: 'Company name', value: 'company_name' }
                ];
                return <BlockStack gap="400">{layoutOverrideEditor}<Text variant="headingMd" as="h3">DROPDOWN LIST</Text><TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" /><TextField id="placeholder" label="Placeholder" value={s.placeholder || ''} onChange={handleFieldChange} autoComplete="off" /><Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} /><Select id="connectTo" label="Connect this field to" options={dropdownOptions} value={s.connectTo || 'nothing'} onChange={handleFieldChange} /><TextField multiline={3} id="values" label="Values separated by comma" value={s.values || ''} onChange={handleFieldChange} helpText="Example: Value 1,Value 2,Value 3" autoComplete="off" /></BlockStack>;
            case 'custom-single-choice':
                return (
                    <BlockStack gap="400">
                        {layoutOverrideEditor}
                        <Text variant="headingMd" as="h3">SINGLE-CHOICE INPUT</Text>
                        <TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" />
                        <TextField multiline={3} id="values" label="Values (comma-separated)" value={s.values || ''} onChange={handleFieldChange} helpText="Example: Choice A, Choice B" autoComplete="off" />
                        <Checkbox id="preselectFirst" label="Pre-select first option" checked={s.preselectFirst || false} onChange={handleCheckboxChange} />
                        <Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} />
                        <Select id="connectTo" label="Connect this field to" options={connectOptions} value={s.connectTo || 'nothing'} onChange={handleFieldChange} />
                    </BlockStack>
                );
            case 'custom-checkbox':
                return <BlockStack gap="400">{layoutOverrideEditor}<Text variant="headingMd" as="h3">CHECKBOX</Text><TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" /><TextField id="checkboxName" label="Checkbox name" value={s.checkboxName || ''} onChange={handleFieldChange} autoComplete="off" /><Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} /></BlockStack>;
            case 'custom-date-selector':
                return (
                    <BlockStack gap="400">
                        {layoutOverrideEditor}
                        <Text variant="headingMd" as="h3">DATE SELECTOR</Text>
                        <TextField id="label" label="Label" value={s.label || ''} onChange={handleFieldChange} autoComplete="off" />
                        <TextField id="placeholder" label="Placeholder" value={s.placeholder || ''} onChange={handleFieldChange} autoComplete="off" />
                        <Checkbox id="required" label="Required" checked={s.required || false} onChange={handleCheckboxChange} />
                        <Checkbox id="showIcon" label="Show field icon" checked={s.showIcon || false} onChange={handleCheckboxChange} />
                        <Checkbox id="excludeSaturdays" label="Exclude Saturdays" checked={s.excludeSaturdays || false} onChange={handleCheckboxChange} />
                        <Checkbox id="excludeSundays" label="Exclude Sundays" checked={s.excludeSundays || false} onChange={handleCheckboxChange} />
                        <Checkbox id="allowOnlyNextDays" label="Allow only future dates" checked={s.allowOnlyNextDays || false} onChange={handleCheckboxChange} />
                    </BlockStack>
                );
            case 'custom-link-button': return <BlockStack gap="400"><Text variant="headingMd" as="h3">LINK BUTTON</Text><TextField id="buttonUrl" label="Button URL" value={s.buttonUrl || ''} onChange={handleFieldChange} type="url" autoComplete="off" />{renderButtonSettings({ hideDiscountType: true })}</BlockStack>;
            case 'custom-password-field': return <BlockStack gap="400"><Text variant="headingMd" as="h3">PASSWORD FIELD</Text>{renderCommonTextFields({ hasIcon: true })}</BlockStack>;

case 'wilaya': {
    const logisticsField = allFormFields.find(f => f.type === 'logistics-delivery');
    const logisticsSettings = logisticsField?.settings as LogisticsDeliverySettings | undefined;
    
    return (
        <BlockStack gap="400">
            <Text variant="headingMd" as="h3">WILAYA FIELD</Text>
            {layoutOverrideEditor}
            <TextField 
                id="label" 
                label="Wilaya field label" 
                value={s.label || 'Wilaya'} 
                onChange={handleFieldChange} 
                autoComplete="off" 
            />
            <Checkbox 
                id="required" 
                label="Required" 
                checked={s.required !== false} 
                onChange={handleCheckboxChange} 
            />
            {/* ADDED SECTION */}
            <Checkbox
                id="showWilayaNumbers"
                label="Show wilaya numbers (01 - Adrar, 02 - Chlef, etc.)"
                checked={logisticsSettings?.showWilayaNumbers !== false}
                onChange={(checked) => {
                    if (logisticsField) {
                        onSettingsChange(logisticsField.id, { showWilayaNumbers: checked });
                    }
                }}
                
            />
            {/* END OF ADDED SECTION */}
            <Select
                id="wilayaLanguage"
                label="Wilaya language"
                options={[
                    { label: 'Arabic', value: 'arabic' },
                    { label: 'French', value: 'french' }
                ]}
                value={logisticsSettings?.algeriaWilayaMode || 'arabic'}
                onChange={(value) => {
                    if (logisticsField) {
                        onSettingsChange(logisticsField.id, { algeriaWilayaMode: value as 'arabic' | 'french' });
                    }
                }}
                helpText="Choose the language for wilaya names display"
            />
            
            {/* NEW: Wilaya Restrictions Section */}
            <Card>
                <BlockStack gap="400">
                    <Text variant="headingMd" as="h4">Location restrictions (optional)</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Enable only for specific Wilayas. Search and click on Wilayas to add them. Selected Wilayas will appear as tags below.
                    </Text>
                    <Autocomplete
                        options={allWilayas
                            .filter(wilaya => !(logisticsSettings?.hiddenWilayas || []).includes(wilaya.id.toString()))
                            .map(wilaya => ({
                                value: wilaya.id.toString(),
                                label: `${String(wilaya.id).padStart(2, '0')} - ${logisticsSettings?.algeriaWilayaMode === 'arabic' ? wilaya.wilaya_name : wilaya.wilaya_name_ascii}`
                            }))
                        }
                        selected={[]}
                        onSelect={(selected) => {
                            const newHidden = selected.find(option => !(logisticsSettings?.hiddenWilayas || []).includes(option));
                            if (newHidden && logisticsField) {
                                const currentHidden = logisticsSettings?.hiddenWilayas || [];
                                onSettingsChange(logisticsField.id, {
                                    hiddenWilayas: [...currentHidden, newHidden]
                                });
                            }
                        }}
                        textField={
                            <Autocomplete.TextField
                                onChange={() => {}}
                                value=""
                                label="Hide specific Wilayas"
                                placeholder="Search and select Wilayas to hide"
                                helpText="Search and click on Wilayas to hide them. Hidden Wilayas will appear as tags below."
                                autoComplete="off"
                            />
                        }
                    />
                    {(logisticsSettings?.hiddenWilayas || []).length > 0 && (
                        <LegacyStack spacing="tight">
                            {(logisticsSettings?.hiddenWilayas || []).map((wilayaId) => {
                                const wilaya = allWilayas.find(w => w.id.toString() === wilayaId);
                                if (!wilaya) return null;
                                const displayName = `${String(wilaya.id).padStart(2, '0')} - ${logisticsSettings?.algeriaWilayaMode === 'arabic' ? wilaya.wilaya_name : wilaya.wilaya_name_ascii}`;
                                return (
                                    <Tag
                                        key={wilayaId}
                                        onRemove={() => {
                                            if (logisticsField) {
                                                const currentHidden = logisticsSettings?.hiddenWilayas || [];
                                                onSettingsChange(logisticsField.id, {
                                                    hiddenWilayas: currentHidden.filter(id => id !== wilayaId)
                                                });
                                            }
                                        }}
                                    >
                                        {displayName}
                                    </Tag>
                                );
                            })}
                        </LegacyStack>
                    )}
                    {(logisticsSettings?.hiddenWilayas || []).length > 0 && (
                        <Text as="p" variant="bodySm" tone="subdued">
                            {(logisticsSettings?.hiddenWilayas || []).length} Wilaya{(logisticsSettings?.hiddenWilayas || []).length !== 1 ? 's' : ''} hidden. These wilayas will not be available for customer selection.
                        </Text>
                    )}
                </BlockStack>
            </Card>
        </BlockStack>
    );
}
case 'commune': {
    const logisticsField = allFormFields.find(f => f.type === 'logistics-delivery');
    const logisticsSettings = logisticsField?.settings as LogisticsDeliverySettings | undefined;
    
    return (
        <BlockStack gap="400">
            <Text variant="headingMd" as="h3">COMMUNE FIELD</Text>
            {layoutOverrideEditor}
            <TextField 
                id="label" 
                label="Commune field label" 
                value={s.label || 'Commune'} 
                onChange={handleFieldChange} 
                autoComplete="off" 
            />
            <Checkbox 
                id="required" 
                label="Required" 
                checked={s.required !== false} 
                onChange={handleCheckboxChange} 
            />
            <Select
                id="communeLanguage"
                label="Commune language"
                options={[
                    { label: 'Arabic', value: 'arabic' },
                    { label: 'French', value: 'french' }
                ]}
                value={logisticsSettings?.algeriaCommuneMode || 'french'}
                onChange={(value) => {
                    if (logisticsField) {
                        onSettingsChange(logisticsField.id, { algeriaCommuneMode: value as 'arabic' | 'french' });
                    }
                }}
                helpText="Choose the language for commune names display"
            />
        </BlockStack>
    );
};
case 'custom-icon-feature': {
    const s = field.settings as CustomIconFeatureSettings;
    
    return (
        <BlockStack gap="500">
            {/* Header Section with Icon */}
            <LegacyStack alignment="center" spacing="tight">
                <div style={{ 
                    backgroundColor: '#E3F2FD', 
                    borderRadius: '8px', 
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon source={StarFilledIcon} tone="info" />
                </div>
                <BlockStack gap="100">
                    <Text variant="headingLg" as="h2">Trust Badges</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                        Build customer confidence with trust indicators
                    </Text>
                </BlockStack>
            </LegacyStack>

            <Divider />

            {/* Title Configuration Section */}
            <Card>
                <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">
                        <LegacyStack alignment="center" spacing="tight">
                            <Icon source={TextBlockIcon} />
                            {/* The text now sits correctly beside the icon */}
                            <span>Title Configuration</span>
                        </LegacyStack>
                    </Text>
                    
                    <TextField
                        id="title"
                        label="Title Text"
                        value={s.title || ''}
                        onChange={(value) => handleFieldChange(value, 'title')}
                        autoComplete="off"
                        helpText="Optional heading to display with your trust badges"
                        placeholder="e.g., Why choose us?, Our guarantees"
                    />

                    <Select
                        id="titlePosition"
                        label="Title Position"
                        options={[
                            { label: '📍 Above Icons', value: 'top' },
                            { label: '📍 Below Icons', value: 'bottom' },
                        ]}
                        value={s.titlePosition || 'top'}
                        onChange={(value) => handleFieldChange(value, 'titlePosition')}
                        helpText="Choose where to display the title relative to your badges"
                    />
                </BlockStack>
            </Card>

            {/* Icons Configuration Section */}
            <Card>
                <BlockStack gap="500">
                    <LegacyStack distribution="equalSpacing" alignment="center">
                        <Text variant="headingMd" as="h3">
                            <LegacyStack alignment="center" spacing="tight">
                                <Icon source={ImageIcon} />
                                Trust Badges ({s.features.filter(f => f.enabled).length}/3 active)
                            </LegacyStack>
                        </Text>
                    </LegacyStack>

                    <Text as="p" variant="bodyMd" tone="subdued">
                        Configure up to 3 trust badges to showcase your key value propositions
                    </Text>

                    <BlockStack gap="400">
                        {s.features.map((feature, index) => (
                            <Card key={index}> <Box padding="400">
                                <BlockStack gap="400">
                                    {/* Badge Header */}
                                    <LegacyStack distribution="equalSpacing" alignment="center">
                                        <LegacyStack alignment="center" spacing="tight">
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                backgroundColor: feature.enabled ? '#00A047' : '#E1E3E5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: 'white'
                                            }}>
                                                {index + 1}
                                            </div>
                                            <Text variant="headingSm" as="h4">
                                                Badge {index + 1}
                                            </Text>
                                        </LegacyStack>
                                        
                                        <LegacyStack alignment="center" spacing="tight">
                                            {feature.enabled && feature.imageUrl && (
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    border: '1px solid #E1E3E5'
                                                }}>
                                                    <img 
                                                        src={feature.imageUrl} 
                                                        alt="Preview" 
                                                        style={{ 
                                                            width: '100%', 
                                                            height: '100%', 
                                                            objectFit: 'contain' 
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <Checkbox
                                                label="Enable"
                                                checked={feature.enabled}
                                                onChange={(checked) => handleFeatureChange(index, 'enabled', checked)}
                                            />
                                        </LegacyStack>
                                    </LegacyStack>

                                    {/* Configuration Fields - Only show when enabled */}
                                    {feature.enabled && (
                                        <BlockStack gap="300">
                                            <TextField
                                                id={`imageUrl_${index}`}
                                                label="Image URL"
                                                value={feature.imageUrl}
                                                onChange={(value) => handleFeatureChange(index, 'imageUrl', value)}
                                                autoComplete="off"
                                                helpText="URL to your trust badge icon (PNG, JPG, SVG recommended)"
                                                placeholder="https://example.com/icon.png"
                                                prefix={<Icon source={LinkIcon} />}
                                            />
                                            
                                            <TextField
                                                id={`caption_${index}`}
                                                label="Caption"
                                                value={feature.caption}
                                                onChange={(value) => handleFeatureChange(index, 'caption', value)}
                                                autoComplete="off"
                                                helpText="Short text to describe this trust indicator"
                                                placeholder="e.g., Free shipping, Money back guarantee"
                                                maxLength={50}
                                                showCharacterCount
                                            />
                                        </BlockStack>
                                    )}

                                    {/* Disabled State Message */}
                                    {!feature.enabled && (
                                        <div style={{
                                            padding: '12px',
                                            backgroundColor: '#F6F6F7',
                                            borderRadius: '6px',
                                            textAlign: 'center'
                                        }}>
                                            <Text as="p" variant="bodyMd" tone="subdued">
                                                Enable this badge to configure its settings
                                            </Text>
                                        </div>
                                    )}
                                </BlockStack>

                            </Box></Card>
                        ))}
                    </BlockStack>

                    {/* Quick Setup Tips */}
                    {s.features.filter(f => f.enabled).length === 0 && (
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#FFF4E5',
                            borderRadius: '8px',
                            border: '1px solid #FFD666'
                        }}>
                            <BlockStack gap="200">
                                <LegacyStack alignment="center" spacing="tight">
                                    <Icon source={AlertTriangleIcon} tone="warning" />
                                    <Text as="h3" variant="headingSm">Quick setup tips</Text>
                                </LegacyStack>
                                <Text as="p" variant="bodyMd">
                                    • Enable at least one badge to see the preview
                                    <br />
                                    • Use high-quality icons (64x64px or larger)
                                    <br />
                                    • Keep captions short and impactful
                                    <br />
                                    • Common badges: Security, Shipping, Guarantee, Support
                                </Text>
                            </BlockStack>
                        </div>
                    )}
                </BlockStack>
            </Card>
        </BlockStack>
    );
}

            default: return <LegacyStack alignment="center" spacing="tight"><Icon source={InfoIcon} /><Text as="p" tone="subdued">No specific settings for this field.</Text></LegacyStack>;
        }
    };

    return (
        <div
            style={{ padding: 'var(--p-space-200)', backgroundColor: 'var(--p-color-bg-surface-secondary)' }}
        >
            {getEditorContent()}
        </div>
    );
};
const wilayasOfAlgeria = [
    'Adrar',
    'Aïn Defla',
    'Aïn Témouchent',
    'Algiers',
    'Annaba',
    'Batna',
    'Béchar',
    'Béjaïa',
    'Beni Abbès',
    'Biskra',
    'Blida',
    'Bordj Badji Mokhtar',
    'Bordj Bou Arreridj',
    'Bouira',
    'Boumerdès',
    'Chlef',
    'Constantine',
    'Djanet',
    'Djelfa',
    'El Bayadh',
    'El M\'Ghair',
    'El Meniaa',
    'El Oued',
    'El Tarf',
    'Ghardaïa',
    'Guelma',
    'Illizi',
    'In Guezzam',
    'In Salah',
    'Jijel',
    'Khenchela',
    'Laghouat',
    'M\'Sila',
    'Mascara',
    'Médéa',
    'Mila',
    'Mostaganem',
    'Naâma',
    'Oran',
    'Ouargla',
    'Ouled Djellal',
    'Oum El Bouaghi',
    'Relizane',
    'Saïda',
    'Sétif',
    'Sidi Bel Abbès',
    'Skikda',
    'Souk Ahras',
    'Tamanrasset',
    'Tébessa',
    'Tiaret',
    'Timimoun',
    'Tindouf',
    'Tipaza',
    'Tissemsilt',
    'Tizi Ouzou',
    'Tlemcen',
    'Touggourt'
];

/* -------------------------------------------------------------------------- */
/* ShippingRateEditor (Polaris Component)                                     */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* ShippingRateEditor (Polaris Component)                                     */
/* -------------------------------------------------------------------------- */
const ShippingRateEditor: React.FC<{ onSave: (rate: Omit<ShippingRate, 'id'>) => void; onCancel: () => void; initialData?: ShippingRate | null; }> = ({ onSave, onCancel, initialData }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState<string>('0');
    const [description, setDescription] = useState('');
    const [conditions, setConditions] = useState<RateCondition[]>([]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setPrice(String(initialData.price));
            setDescription(initialData.description || '');
            // Convert legacy provinces string to a condition
            const initialConditions = initialData.conditions || [];
            if (initialData.provinces) {
                const provinceCondition = {
                    id: `cond-wilaya-${Date.now()}`,
                    type: 'is_wilaya' as ConditionType,
                    value: initialData.provinces.split(',').map(p => p.trim()),
                };
                initialConditions.push(provinceCondition);
            }
            setConditions(initialConditions);
        }
    }, [initialData]);

    const handleAddCondition = () => setConditions([...conditions, { id: `cond-${Date.now()}`, type: 'price_gte', value: '' }]);
    const handleUpdateCondition = (index: number, field: keyof RateCondition, value: any) => {
        const newConditions = [...conditions];
        newConditions[index] = { ...newConditions[index], [field]: value };
        setConditions(newConditions);
    };
    const handleRemoveCondition = (id: string) => setConditions(conditions.filter(c => c.id !== id));

 const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const provinces = (conditions.find(c => c.type === 'is_wilaya')?.value as string[] || []).join(', ');
    onSave({ name, price: Number(price), description, conditions, provinces });
};

    const conditionOptions = [
        { label: 'Location is Wilaya...', value: 'is_wilaya' },
        { label: 'Order total ≥', value: 'price_gte' },
        { label: 'Order total <', value: 'price_lt' },
        { label: 'Order weight ≥', value: 'weight_gte' },
        { label: 'Order weight <', value: 'weight_lt' },
        { label: 'Quantity ≥', value: 'quantity_gte' },
        { label: 'Quantity <', value: 'quantity_lt' },
        { label: 'Cart contains product', value: 'includes_product' },
        { label: 'Cart does not contain product', value: 'excludes_product' }
    ];

    const renderValueInput = (cond: RateCondition, index: number) => {
        const commonProps = { value: String(cond.value), onChange: (v: string) => handleUpdateCondition(index, 'value', v), autoComplete: 'off' };
        switch (cond.type) {
            case 'is_wilaya':
                return <Autocomplete
                    allowMultiple
                    options={wilayasOfAlgeria.map(w => ({ label: w, value: w }))}
                    selected={Array.isArray(cond.value) ? cond.value : []}
                    onSelect={(selected) => handleUpdateCondition(index, 'value', selected)}
                    textField={
                        <Autocomplete.TextField
                            label="Wilayas"
                            labelHidden
                            value={(cond.value as string[] || []).join(', ')}
                            placeholder="Search and select Wilayas"
                            onChange={() => {}} // onChange is handled by onSelect
                            autoComplete="off"
                        />
                    }
                />
            case 'price_gte': case 'price_lt': return <TextField {...commonProps} type="number" suffix="DZD" label="Value" labelHidden />;
            case 'weight_gte': case 'weight_lt': return <TextField {...commonProps} type="number" suffix="Kg" label="Value" labelHidden/>;
            case 'quantity_gte': case 'quantity_lt': return <TextField {...commonProps} type="number" label="Value" labelHidden/>;
            case 'includes_product': case 'excludes_product': return <TextField {...commonProps} placeholder="e.g. 123, 456" helpText="Product IDs (comma-separated)" label="Value" labelHidden/>;
            default: return null;
        }
    }

    return (
        <MuiCollapse in={true} timeout="auto" unmountOnExit>
            <Box padding="400" borderColor="border" borderWidth="025" borderRadius="200" background="bg-surface-secondary">
                <form onSubmit={handleSubmit}>
                    <BlockStack gap="400">
                        <Text variant="headingLg" as="h3">{initialData ? 'Edit Shipping Rate' : 'Add Shipping Rate'}</Text>
                        <TextField label="Rate name" value={name} onChange={setName} requiredIndicator autoComplete="off" />
                        <TextField label="Rate description (optional)" value={description} onChange={setDescription} multiline={2} autoComplete="off" />
                        <TextField label="Rate price" value={price} onChange={setPrice} type="number" suffix="DZD" requiredIndicator autoComplete="off" />
                        
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h4">Rate Conditions</Text>
                                <Text as="p" tone="subdued">This rate will only apply if ALL conditions are met.</Text>
                                {conditions.map((cond, index) => (
                                    <LegacyStack key={cond.id} alignment="trailing" spacing="tight">
                                        <LegacyStack.Item fill>
                                            <Select label="Condition type" labelHidden options={conditionOptions} value={cond.type} onChange={v => handleUpdateCondition(index, 'type', v as ConditionType)} />
                                        </LegacyStack.Item>
                                        <LegacyStack.Item fill>{renderValueInput(cond, index)}</LegacyStack.Item>
                                        <Button icon={DeleteIcon} accessibilityLabel="Remove condition" onClick={() => handleRemoveCondition(cond.id)} />
                                    </LegacyStack>
                                ))}
                                <Button onClick={handleAddCondition} icon={PlusIcon}>Add another condition</Button>
                            </BlockStack>
                        </Card>
                        
                        <LegacyStack distribution="trailing">
                            <Button onClick={onCancel}>Cancel</Button>
                            <Button variant="primary" submit>Save Rate</Button>
                        </LegacyStack>
                    </BlockStack>
                </form>
            </Box>
        </MuiCollapse>
    );
};

/* -------------------------------------------------------------------------- */
/* FormStyleEditor Component (FIXED)                                          */
/* -------------------------------------------------------------------------- */
const FormStyleEditor: React.FC<{
    formStyle: FormStyle;
    setFormStyle: React.Dispatch<React.SetStateAction<FormStyle>>;
    ColorPickerTrigger: React.FC<{
        settingKey: string;
        label: string;
        enableGradient?: boolean;
        getSettings: () => any;
        onUpdate?: (value: string) => void;
    }>;
    showSnack: (severity: 'success' | 'error' | 'info', heading: string, msg: string) => void;
}> = ({ formStyle, setFormStyle, ColorPickerTrigger, showSnack }) => {

    const handleTextColorChange = useCallback((value: string) => setFormStyle(prev => ({ ...prev, textColor: value })), [setFormStyle]);
    const handleBackgroundColorChange = useCallback((value: string) => setFormStyle(prev => ({ ...prev, backgroundColor: value })), [setFormStyle]);
    const handleBorderColorChange = useCallback((value: string) => setFormStyle(prev => ({ ...prev, borderColor: value })), [setFormStyle]);
    const handleFontSizeChange = useCallback((value: RangeSliderValue) => {
        const numValue = typeof value === 'number' ? value : value[0];
        setFormStyle(prev => ({ ...prev, fontSize: numValue }));
    }, [setFormStyle]);
    const handleBorderRadiusChange = useCallback((value: RangeSliderValue) => {
        const numValue = typeof value === 'number' ? value : value[0];
        setFormStyle(prev => ({ ...prev, borderRadius: numValue }));
    }, [setFormStyle]);
    const handleBorderWidthChange = useCallback((value: RangeSliderValue) => {
        const numValue = typeof value === 'number' ? value : value[0];
        setFormStyle(prev => ({ ...prev, borderWidth: numValue }));
    }, [setFormStyle]);
    const handleShadowChange = useCallback((value: RangeSliderValue) => {
        const numValue = typeof value === 'number' ? value : value[0];
        setFormStyle(prev => ({ ...prev, shadow: numValue }));
    }, [setFormStyle]);

    const handleResetToDefault = useCallback(() => {
        setFormStyle(initialFormStyle);
        showSnack('success', 'Style Reset', 'Form style has been successfully reset to default values.');
    }, [setFormStyle, showSnack]);

    // Compact color field
    const ColorField: React.FC<{
        label: string;
        settingKey: string;
        color: string;
        onUpdate: (value: string) => void;
        enableGradient?: boolean;
    }> = useCallback(({ label, settingKey, color, onUpdate, enableGradient }) => (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '4px' }}>
                <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                    {label}
                </Text>
            </div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    minHeight: '28px'
                }}
            >
                <div
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: '1px solid #d9d9d9',
                        marginRight: '6px',
                        flexShrink: 0
                    }}
                />
                <div style={{
                    color: '#5c5f62',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    fontWeight: '500'
                }}>
                    {color}
                </div>
                <div style={{ opacity: 0, position: 'absolute' }}>
                    <ColorPickerTrigger
                        getSettings={() => formStyle}
                        onUpdate={onUpdate}
                        settingKey={settingKey}
                        label={label}
                        enableGradient={enableGradient}
                    />
                </div>
            </div>
        </div>
    ), [ColorPickerTrigger, formStyle]);

    // Compact slider component
    const SliderField: React.FC<{
        label: string;
        value: number;
        onChange: (value: RangeSliderValue) => void;
        min: number;
        max: number;
        suffix?: string;
    }> = useCallback(({ label, value, onChange, min, max, suffix }) => (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                    {label}
                </Text>
            </div>
            <RangeSlider
                label={label} // Added label prop
                labelHidden // Hide label visually as custom label is used
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={1}
            />
        </div>
    ), []);

    return (
        <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.3s ease', // Added transition for overall editor
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                    Form style
                </Text>
                <Button
                    onClick={handleResetToDefault}
                    size="slim"
                    variant="tertiary"
                    icon={ReplayIcon}
                >
                    Reset to default
                </Button>
            </div>

            {/* Three Column Layout for main controls */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
            }}>
                <ColorField
                    label="Text color"
                    settingKey="textColor"
                    color={formStyle.textColor}
                    onUpdate={handleTextColorChange}
                />

                <SliderField
                    label="Font size"
                    value={formStyle.fontSize}
                    onChange={handleFontSizeChange}
                    min={10}
                    max={24}
                    suffix={`${formStyle.fontSize}px`}
                />

                <SliderField
                    label="Border radius"
                    value={formStyle.borderRadius}
                    onChange={handleBorderRadiusChange}
                    min={0}
                    max={24}
                    suffix={`${formStyle.borderRadius}px`}
                />
            </div>

            {/* Background Color with warning */}
            <div style={{ marginBottom: '16px' }}>
                <ColorField
                    label="Background color"
                    settingKey="backgroundColor"
                    color={formStyle.backgroundColor}
                    onUpdate={handleBackgroundColorChange}
                    enableGradient
                />

                <div style={{
                    padding: '6px 8px',
                    backgroundColor: '#fef3cd',
                    borderRadius: '3px',
                    border: '1px solid #fbbf24',
                    marginTop: '4px'
                }}>
                    <div style={{ fontSize: '11px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                            <strong>Important:</strong> changing the background color could affect conversion rate.
                        </Text>
                    </div>
                </div>
            </div>

            {/* Three Column Layout for border and shadow */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
            }}>
                <ColorField
                    label="Border color"
                    settingKey="borderColor"
                    color={formStyle.borderColor}
                    onUpdate={handleBorderColorChange}
                />

                <SliderField
                    label="Border width"
                    value={formStyle.borderWidth}
                    onChange={handleBorderWidthChange}
                    min={0}
                    max={10}
                    suffix={`${formStyle.borderWidth}px`}
                />

                <SliderField
                    label="Shadow"
                    value={formStyle.shadow}
                    onChange={handleShadowChange}
                    min={0}
                    max={10}
                    suffix={formStyle.shadow === 0 ? 'None' : `Level ${formStyle.shadow}`}
                />
            </div>

            {/* Compact Checkboxes Section */}
            <div style={{
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb'
            }}>
                <div style={{
                    display: 'grid',
                    // UPDATED LINE: Uses formStyle.mode instead of formMode
                    gridTemplateColumns: formStyle.mode === 'popup' ? '1fr 1fr' : '1fr',
                    gap: '8px'
                }}>
                    {/* UPDATED LINE: Uses formStyle.mode instead of formMode */}
                    {formStyle.mode === 'popup' && (
                        <Checkbox
                            label="Hide close button"
                            checked={!!formStyle.hideCloseButton}
                            onChange={(v) => setFormStyle(p => ({ ...p, hideCloseButton: v }))}
                        />
                    )}

                    <Checkbox
                        label="Hide field labels"
                        checked={formStyle.hideFieldLabels}
                        onChange={(v) => setFormStyle(p => ({ ...p, hideFieldLabels: v }))}
                    />

                    <Checkbox
                        label="Enable RTL support"
                        checked={formStyle.enableRTL}
                        onChange={(v) => setFormStyle(p => ({ ...p, enableRTL: v }))}
                    />

                    {/* UPDATED LINE: Uses formStyle.mode instead of formMode */}
                    {formStyle.mode === 'popup' && (
                        <Checkbox
                            label="Full screen on mobile"
                            checked={!!formStyle.enableFullScreenMobile}
                            onChange={(v) => setFormStyle(p => ({ ...p, enableFullScreenMobile: v }))}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* PreviewField (NEW MEMOIZED COMPONENT)                                      */
/* -------------------------------------------------------------------------- */
const PreviewField = React.memo(({
    field,
    allFormFields,
    formStyle,
    formValues,
    formErrors,
    previewData,
    setFormValues,
    handleValidation,
    passwordVisible,
    setPasswordVisible,
    allWilayas,
    shippingRates
}: {
    field: FormField;
    allFormFields: FormField[];
    formStyle: FormStyle;
    formValues: Record<string, any>;
    formErrors: Record<string, string | undefined>;
    previewData: any;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    handleValidation: (field: FormField, value: any) => void;
    passwordVisible: boolean;
    setPasswordVisible: React.Dispatch<React.SetStateAction<boolean>>;
    allWilayas: AlgeriaLocation[];
    shippingRates: ShippingRate[];
    isEditingPopupButton: boolean; 
}) => {
    const value = formValues[field.id];
    const error = formErrors[field.id];

    if (!field.enabled) return null;

    const s = field.settings as any;

    const iconMap: { [key: string]: React.ReactNode } = {
        'phone': <DialpadOutlined fontSize="small" />,
        'email': <AlternateEmail fontSize="small" />,
        'first-name': <PersonOutline fontSize="small" />,
        'last-name': <PersonOutline fontSize="small" />,
        'address': <HomeOutlined fontSize="small" />,
        'address2': <HomeOutlined fontSize="small" />,
        'province': <LocationCityOutlined />,
        'zip-code': <LocalShippingOutlined />,
        'custom-text-input': <NotesOutlined fontSize="small" />,
        'custom-password-field': <VpnKeyOutlined fontSize="small" />,
    };

    const renderButton = (btnSettings: ButtonSettings, type: 'submit' | 'link' | 'whatsapp', href?: string, icon?: React.ReactNode) => {
        const hasSubtitle = btnSettings.buttonSubtitle?.trim();
        const totalNumeric = parseFloat((previewData.total || '0').replace(/[^0-9.]/g, ''));
        const animClass = s.animation && s.animation !== 'none' ? `btn-anim-${s.animation.replace(/_/g, '-')}` : '';
        return (
            <MuiStack spacing={0.5} alignItems="center">
                <MuiButton type={type === 'submit' ? 'submit' : undefined} component={type !== 'submit' ? 'a' : 'button'} href={href} target={type !== 'submit' ? '_blank' : undefined} fullWidth startIcon={icon} sx={{ py: 1.5, color: btnSettings.textColor || '#FFFFFF', fontSize: `${btnSettings.fontSize || 16}px`, borderRadius: `${btnSettings.borderRadius || 8}px`, border: `${btnSettings.borderWidth || 0}px solid ${btnSettings.borderColor || '#5c6ac4'}`, boxShadow: muiTheme.shadows[btnSettings.shadow || 2], backgroundColor: btnSettings.backgroundColor || '#5c6ac4', '&:hover': { backgroundColor: btnSettings.backgroundColor || '#5c6ac4', filter: 'brightness(1.1)', }, lineHeight: 1.25, }} className={animClass}>
                    {(btnSettings.buttonText || '').replace('{order_total}', previewData.total)}
                </MuiButton>
                {btnSettings.buttonText?.includes('{order_total}') && formStyle.enableDinarConverter && !isNaN(totalNumeric) && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 0.25 }}>
                        ({toAlgerianText(totalNumeric)})
                    </Typography>
                )}
                {hasSubtitle && (<Typography variant="caption" sx={{ color: btnSettings.textColor || '#FFFFFF', opacity: 0.8, textAlign: 'center', mt: '4px' }}>{btnSettings.buttonSubtitle}</Typography>)}
            </MuiStack>
        );
    };

    switch (field.type) {

        case 'address': {
            const s = field.settings as any;
            return (
                <MuiTextField
                    fullWidth
                    variant="outlined"
                    label={formStyle.hideFieldLabels ? '' : s.label}
                    placeholder={s.placeholder || s.label}
                    required={s.required}
                    error={!!error}
                    helperText={error}
                    value={value || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    onBlur={(e) => handleValidation(field, e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', transition: 'all 0.3s ease', '&:hover': { boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)' }, '&.Mui-focused': { boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25)' } } }}
                    InputProps={{
                        startAdornment: s.showIcon ? (
                            <InputAdornment position="start">
                                <div style={{ color: '#6366f1' }}><HomeOutlined fontSize="small" /></div>
                            </InputAdornment>
                        ) : null
                    }}
                />
            );
        }
        case 'wilaya': {
            const s = field.settings as any;
            const logisticsField = allFormFields.find(f => f.type === 'logistics-delivery');
            const logisticsSettings = logisticsField?.settings as LogisticsDeliverySettings | undefined;

            // Filter out hidden wilayas
            const visibleWilayas = allWilayas.filter(wilaya =>
                !(logisticsSettings?.hiddenWilayas || []).includes(wilaya.id.toString())
            );

            return (
                <MuiFormControl fullWidth required={s.required} error={!!error}>
                    <InputLabel>{s.label || 'Wilaya'}</InputLabel>
                    <MuiSelect
                        value={value || ''}
                        onChange={(e) => {
                            const newWilayaId = e.target.value as string;
                            setFormValues(prev => ({
                                ...prev,
                                [field.id]: newWilayaId,
                                commune: '' // Reset commune when wilaya changes
                            }));
                        }}
                        label={s.label || 'Wilaya'}
                    >
                        {visibleWilayas.length === 0 ? (
                            <MenuItem value="" disabled><em>No Wilayas available...</em></MenuItem>
                        ) : (
                            visibleWilayas.map((w) => (
                                <MenuItem key={w.id} value={w.id.toString()}>
                                    {/* UPDATE THIS LINE */}
                                    {logisticsSettings?.showWilayaNumbers !== false
                                        ? `${String(w.id).padStart(2, '0')} - ${logisticsSettings?.algeriaWilayaMode === 'arabic' ? w.wilaya_name : w.wilaya_name_ascii}`
                                        : `${logisticsSettings?.algeriaWilayaMode === 'arabic' ? w.wilaya_name : w.wilaya_name_ascii}`
                                    }
                                </MenuItem>
                            ))
                        )}
                    </MuiSelect>
                    {error && <FormHelperText>{error}</FormHelperText>}
                </MuiFormControl>
            );
        }


        case 'commune': {
            const s = field.settings as any;
            const logisticsField = allFormFields.find(f => f.type === 'logistics-delivery');
            const logisticsSettings = logisticsField?.settings as LogisticsDeliverySettings | undefined;

            const [communes, setCommunes] = useState<AlgeriaLocation[]>([]);
            const [isLoadingCommunes, setIsLoadingCommunes] = useState(false);

            // Read the selected wilaya from the central form state
            const selectedWilayaId = formValues['wilaya'];

            // Updated useEffect for commune fetching in your PreviewField component
useEffect(() => {
  if (!selectedWilayaId) {
    setCommunes([]);
    return;
  }
  
  setIsLoadingCommunes(true);
  
  // Use the updated fetchCommunesForWilaya function
  fetchCommunesForWilaya(selectedWilayaId)
    .then((data) => {
      console.log("Communes loaded successfully:", data);
      setCommunes(data as AlgeriaLocation[]);
    })
    .catch((err) => {
      console.error("Failed to fetch communes:", err);
      setCommunes([]); // Set empty array on error
      // Optionally show user-friendly error
      // showSnack('error', 'Error', 'Failed to load communes. Please try again.');
    })
    .finally(() => {
      setIsLoadingCommunes(false);
    });
}, [selectedWilayaId]);

            return (
                <MuiFormControl fullWidth required={s.required} error={!!error} disabled={!selectedWilayaId || isLoadingCommunes}>
                    <InputLabel>{s.label || 'Commune'}</InputLabel>
                    <MuiSelect
                        value={value || ''}
                        onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        label={s.label || 'Commune'}
                    >
                        {isLoadingCommunes && <MenuItem value=""><em><CircularProgress size={20} sx={{ mr: 1 }} />Loading...</em></MenuItem>}
                        {!isLoadingCommunes && communes.length === 0 && <MenuItem value=""><em>Select a Wilaya first</em></MenuItem>}
                        {communes.map((c) => (
                            <MenuItem key={c.id} value={c.id.toString()}>
                                {logisticsSettings?.algeriaCommuneMode === 'arabic' ? c.commune_name : c.commune_name_ascii}
                            </MenuItem>
                        ))}
                    </MuiSelect>
                    {error && <FormHelperText>{error}</FormHelperText>}
                </MuiFormControl>
            );
        }
        case 'header': case 'section-header': case 'custom-title':
            return (<MuiBox paddingBlockEnd="500"><div style={{ textAlign: s.alignment, color: s.textColor || '#000000', fontSize: `${s.fontSize || 16}px`, fontWeight: s.fontWeight || 'normal', lineHeight: 1.4, wordBreak: 'break-word', marginBottom: '8px', position: 'relative', }}>{(s.text || '').replace('{order_total}', previewData.total).replace('{product_name}', previewData.productName)}{field.type === 'header' && (<div style={{ width: '60px', height: '3px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '2px', marginTop: '12px', marginLeft: s.alignment === 'center' || s.alignment === 'right' ? 'auto' : '0', marginRight: s.alignment === 'center' || s.alignment === 'left' ? 'auto' : '0', }} />)}</div></MuiBox>);
        case 'discount-codes':
            return (<MuiBox paddingBlockEnd="400"><Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>{s.discountsLineText || 'Discounts'}</Typography><MuiStack direction="row" spacing={1} alignItems="flex-start"><MuiTextField fullWidth size="small" variant="outlined" placeholder={s.discountCodeFieldLabel || 'Discount code'} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', transition: 'all 0.3s ease', '&:hover': { boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)' }, '&.Mui-focused': { boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25)' } } }} /><MuiButton variant="contained" sx={{ bgcolor: s.applyButtonBackgroundColor || '#6366f1', color: '#fff', py: '8px', px: 3, borderRadius: '12px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)', '&:hover': { bgcolor: s.applyButtonBackgroundColor || '#6366f1', filter: 'brightness(1.1)', boxShadow: '0 6px 20px rgba(99, 102, 241, 0.3)' } }}>{s.applyButtonText || 'Apply'}</MuiButton></MuiStack></MuiBox>);
        case 'summary':
            return (<MuiBox paddingBlockEnd="400"><div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}><LegacyStack alignment="center" distribution="equalSpacing"><LegacyStack alignment="center" spacing="baseTight"><MuiBox sx={{ position: 'relative' }}><img src={cleanUrl(previewData.productImage)} alt={previewData.productName} style={{ borderRadius: '6px', width: 48, height: 48, objectFit: 'cover' }} /><div style={{ position: 'absolute', top: '-4px', left: '-4px', backgroundColor: '#6c757d', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', border: '2px solid white' }}>{String(previewData.productQuantity)}</div></MuiBox><Text as="p" fontWeight="medium" variant="bodyMd">{previewData.productName}</Text></LegacyStack><Text as="p" fontWeight="semibold" variant="bodyMd">{previewData.productPrice}</Text></LegacyStack></div></MuiBox>);
        case 'totals-summary': {
            const s = field.settings as any;
            const backgroundColor = safeColor(s.backgroundColor);
            const isLight = isColorLight(backgroundColor);
            const primaryTextColor = isLight ? '#212529' : '#FFFFFF';
            const secondaryTextColor = isLight ? '#6c757d' : 'rgba(255, 255, 255, 0.75)';
            const derivedBorderColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';

            const PriceDisplay = ({ amount, isTotal = false }: { amount: string, isTotal?: boolean }) => {
                const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
                const isFree = isNaN(numericAmount) || numericAmount === 0;

                return (
                    <MuiBox textAlign="right">
                        <Typography variant={isTotal ? "body1" : "body2"} sx={{ fontWeight: isTotal ? 700 : 500, color: primaryTextColor }}>
                            {amount}
                        </Typography>
                        {formStyle.enableDinarConverter && !isFree && (
                            <Typography variant="caption" sx={{ color: secondaryTextColor, fontStyle: 'italic', display: 'block' }}>
                                ({toAlgerianText(numericAmount)})
                            </Typography>
                        )}
                    </MuiBox>
                );
            };

            return (
                <MuiBox sx={{ my: 2, border: `1px solid ${derivedBorderColor}`, borderRadius: '8px', overflow: 'hidden', background: backgroundColor }}>
                    <MuiStack spacing={0}>
                        <MuiBox sx={{ px: 3, py: 2, borderBottom: `1px solid ${derivedBorderColor}` }}>
                            <MuiStack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" sx={{ color: secondaryTextColor }}>{s.subtotalTitle}</Typography>
                                <PriceDisplay amount={previewData.subtotal} />
                            </MuiStack>
                        </MuiBox>
                        <MuiBox sx={{ px: 3, py: 2, borderBottom: `1px solid ${derivedBorderColor}` }}>
                            <MuiStack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" sx={{ color: secondaryTextColor }}>{s.shippingTitle}</Typography>
                                <PriceDisplay amount={previewData.shipping} />
                            </MuiStack>
                        </MuiBox>
                        <MuiBox sx={{ px: 3, py: 2.5 }}>
                            <MuiStack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body1" sx={{ fontWeight: 600, color: primaryTextColor }}>{s.totalTitle}</Typography>
                                <PriceDisplay amount={previewData.total} isTotal />
                            </MuiStack>
                        </MuiBox>
                    </MuiStack>
                </MuiBox>
            );
        }
        /* ----------------- REPLACE THIS ENTIRE BLOCK ----------------- */
        case 'shipping-rates': {
            const s = field.settings as ShippingRatesSettings;
            const logisticsField = allFormFields.find(f => f.type === 'logistics-delivery');
            const logisticsSettings = logisticsField?.settings as LogisticsDeliverySettings | undefined;

            // 1. Read the selected wilaya directly from the central form state.
            const selectedWilaya = formValues['wilaya'];

            // 2. Local state for choices within this component.
            const [deliveryType, setDeliveryType] = useState(logisticsSettings?.defaultDeliveryType || 'home');
            const [selectedCompany, setSelectedCompany] = useState<string>('');

            // 3. Add default values for settings to prevent undefined issues
            const enableCompanySelection = s.enableCompanySelection ?? false;
            const selectedDeliveryCompanies = s.selectedDeliveryCompanies ?? [];
            const companySelectionMode = s.companySelectionMode ?? 'auto';

            // 4. Get both imported rates and manual rates
            const importedRates = useMemo(() => {
                if (!selectedWilaya || !logisticsSettings?.manualRates) {
                    return [];
                }
                const wilayaId = parseInt(selectedWilaya, 10);
                return logisticsSettings.manualRates.filter(rate =>
                    rate.wilayaId === wilayaId &&
                    selectedDeliveryCompanies.includes(rate.apiProvider || 'manual')
                );
            }, [selectedWilaya, logisticsSettings?.manualRates, selectedDeliveryCompanies]);

            // 5. Get manual shipping rates from the parent component
            const manualRates = useMemo(() => {
                if (!selectedWilaya) return [];

                const wilayaId = parseInt(selectedWilaya, 10);
                const selectedWilayaInfo = allWilayas.find(w => w.id === wilayaId);
                if (!selectedWilayaInfo) return [];

                const selectedWilayaName = selectedWilayaInfo.wilaya_name_ascii;

                return shippingRates.filter(rate => {
                    // If there are no conditions, the rate is always applicable.
                    if (!rate.conditions || rate.conditions.length === 0) {
                        // Backwards compatibility for old rates using the 'provinces' string
                        if (rate.provinces) {
                            const applicableProvinces = rate.provinces.split(',').map(p => p.trim().toLowerCase());
                            return applicableProvinces.includes(selectedWilayaName.toLowerCase());
                        }
                        return true;
                    }

                    // Check all conditions. Every condition must be met.
                    return rate.conditions.every(condition => {
                        if (condition.type === 'is_wilaya') {
                            const applicableWilayas = Array.isArray(condition.value) ? condition.value : [condition.value];
                            // If there are no wilayas specified in the condition, it doesn't restrict, so it passes.
                            if (applicableWilayas.length === 0) return true;
                            return applicableWilayas.map(w => String(w).toLowerCase()).includes(selectedWilayaName.toLowerCase());
                        }
                        // Add logic for other conditions (price, weight, etc.) here if needed for preview
                        // For now, we assume other conditions are met for preview purposes.
                        return true;
                    });
                }).map(rate => ({
                    ...rate,
                    apiProvider: 'manual',
                    homeDeliveryPrice: rate.price,
                    stopDeskPrice: rate.price,
                }));
            }, [selectedWilaya, shippingRates, allWilayas]);

            // 6. Combine both rate types
            const availableCompanies = useMemo(() => {
                const combined = [...importedRates];

                // Add manual rates as a separate "company"
                if (manualRates.length > 0) {
                    const manualCompanyRates = manualRates.map(rate => ({
                        wilayaId: parseInt(selectedWilaya, 10),
                        wilayaName: allWilayas.find(w => w.id === parseInt(selectedWilaya, 10))?.wilaya_name || '',
                        wilayaNameArabic: allWilayas.find(w => w.id === parseInt(selectedWilaya, 10))?.wilaya_name || '',
                        homeDeliveryPrice: rate.price,
                        stopDeskPrice: rate.price,
                        apiProvider: 'manual'
                    }));
                    combined.push(...manualCompanyRates);
                }

                return combined;
            }, [importedRates, manualRates, selectedWilaya, allWilayas]);

            // 7. Effect to calculate the shipping price and update the central form state.
            useEffect(() => {
                const wilayaId = parseInt(selectedWilaya, 10);
                if (!wilayaId) {
                    setFormValues(prev => ({ ...prev, shippingPrice: 0 }));
                    return;
                }

                let chosenRate: any;

                if (enableCompanySelection && availableCompanies.length > 0) {
                    if (companySelectionMode === 'auto_cheapest') {
                        chosenRate = availableCompanies.reduce((prev, current) => {
                            const prevPrice = deliveryType === 'home' ? prev.homeDeliveryPrice : prev.stopDeskPrice;
                            const currentPrice = deliveryType === 'home' ? current.homeDeliveryPrice : current.stopDeskPrice;
                            return (currentPrice ?? Infinity) < (prevPrice ?? Infinity) ? current : prev;
                        });
                    } else if (companySelectionMode === 'auto_default') {
                        const defaultCompany = logisticsSettings?.defaultCompany;
                        chosenRate = availableCompanies.find(rate => rate.apiProvider === defaultCompany) || availableCompanies[0];
                    } else if (selectedCompany) {
                        chosenRate = availableCompanies.find(rate => rate.apiProvider === selectedCompany);
                    } else {
                        chosenRate = availableCompanies[0];
                    }
                } else {
                    // ✅ FIX: When company selection is disabled, find the overall cheapest rate from all sources.
                    if (availableCompanies.length > 0) {
                        chosenRate = availableCompanies.reduce((prev, current) => {
                            const prevPrice = deliveryType === 'home' ? prev.homeDeliveryPrice : prev.stopDeskPrice;
                            const currentPrice = deliveryType === 'home' ? current.homeDeliveryPrice : current.stopDeskPrice;
                            // Handle cases where price might be undefined or null
                            return (currentPrice ?? Infinity) < (prevPrice ?? Infinity) ? current : prev;
                        });
                    }
                }

                const finalPrice = chosenRate ? (deliveryType === 'home' ? chosenRate.homeDeliveryPrice : chosenRate.stopDeskPrice) : 0;

                setFormValues(prev => ({ ...prev, shippingPrice: finalPrice ?? 0 }));

            }, [selectedWilaya, selectedCompany, deliveryType, availableCompanies, logisticsSettings, enableCompanySelection, companySelectionMode, setFormValues, manualRates]);

            // Rest of the component remains the same...
            return (
                <MuiBox sx={{ my: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, background: '#fafafa' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{s.title || 'Shipping Method'}</Typography>

                    {(!logisticsSettings && manualRates.length === 0) ? (
                        <Typography variant="body2" color="text.secondary">
                            Shipping rates are not yet configured. Please add manual rates or configure logistics delivery.
                        </Typography>
                    ) : !selectedWilaya ? (
                        <Typography variant="body2" color="text.secondary">
                            {s.selectWilayaPrompt || 'Please select a Wilaya to see available shipping options.'}
                        </Typography>
                    ) : (
                        <MuiStack spacing={2}>
                            {/* Enhanced Delivery Type Selection */}
                            {(logisticsSettings?.deliveryTypeMode === 'both' || manualRates.length > 0) && (
                                <MuiBox sx={{ my: 2 }}>
                                    <MuiFormControl component="fieldset" fullWidth>
                                        <FormLabel component="legend" sx={{ mb: 2, fontSize: '1rem', fontWeight: 500, color: 'text.primary', textAlign: 'center' }}>
                                            Choose Your Delivery Method
                                        </FormLabel>
                                        <MuiStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                                            {[
                                                { value: 'home', icon: 'https://cdn-icons-png.flaticon.com/512/10351/10351839.png', title: 'Home Delivery', caption: 'Direct to your doorstep' },
                                                { value: 'stopdesk', icon: 'https://cdn-icons-png.flaticon.com/512/12341/12341321.png', title: 'Stop Desk', caption: 'Pick up at a collection point' }
                                            ].map((option) => (
                                                <MuiBox
                                                    key={option.value}
                                                    onClick={() => setDeliveryType(option.value as "home" | "stopdesk")}
                                                    sx={{ flex: 1, minWidth: 140, maxWidth: 180, position: 'relative', cursor: 'pointer', border: '2px solid', borderColor: deliveryType === option.value ? 'primary.main' : 'grey.300', borderRadius: 3, p: 1.5, textAlign: 'center', backgroundColor: deliveryType === option.value ? 'primary.50' : 'background.paper', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { borderColor: 'primary.main', backgroundColor: 'primary.50', transform: 'translateY(-2px)', boxShadow: 2 } }}
                                                >
                                                    <FormControlLabel value={option.value} control={<MuiRadio checked={deliveryType === option.value} onChange={(e) => setDeliveryType(e.target.value as "home" | "stopdesk")} sx={{ position: 'absolute', top: 4, right: 4, color: 'primary.main' }} />} label="" sx={{ m: 0, width: '100%' }} />
                                                    <MuiBox sx={{ mb: 1 }}>
                                                        <img src={option.icon} alt={option.title} style={{ width: 36, height: 36, filter: deliveryType === option.value ? 'drop-shadow(0 2px 4px rgba(25, 118, 210, 0.3))' : 'grayscale(30%)', transition: 'all 0.3s ease', transform: deliveryType === option.value ? 'scale(1.1)' : 'scale(1)' }} />
                                                    </MuiBox>
                                                    <Typography variant="body1" sx={{ fontWeight: 600, color: deliveryType === option.value ? 'primary.main' : 'text.primary', mb: 0.5, fontSize: '0.9rem' }}>
                                                        {option.title}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: deliveryType === option.value ? 'primary.dark' : 'text.secondary', lineHeight: 1.3 }}>
                                                        {option.caption}
                                                    </Typography>
                                                </MuiBox>
                                            ))}
                                        </MuiStack>
                                    </MuiFormControl>
                                </MuiBox>
                            )}

                            {/* Company Selection */}
                            {enableCompanySelection && (companySelectionMode === 'dropdown' || companySelectionMode === 'radio') && (
                                availableCompanies.length > 0 ? (
                                    companySelectionMode === 'dropdown' ? (
                                        <MuiFormControl fullWidth>
                                            <InputLabel>Delivery Company</InputLabel>
                                            <MuiSelect value={selectedCompany} label="Delivery Company" onChange={(e) => setSelectedCompany(e.target.value as string)}>
                                                {availableCompanies.map((rate, index) => (
                                                    <MenuItem key={`${rate.apiProvider}-${index}`} value={rate.apiProvider ?? ''}>
                                                        <MuiStack direction="row" alignItems="center" spacing={1.5} width="100%" justifyContent="space-between">
                                                            <MuiStack direction="row" alignItems="center" spacing={1}>
                                                                {rate.apiProvider !== 'manual' && LOGO_URLS[rate.apiProvider as LogoKey] && (
                                                                    <img src={LOGO_URLS[rate.apiProvider as LogoKey]} alt={`${rate.apiProvider} logo`} style={{ height: '24px', width: 'auto', maxWidth: '70px', objectFit: 'contain' }} />
                                                                )}
                                                                <Typography variant="body2">{rate.apiProvider === 'manual' ? 'Manual Rate' : rate.apiProvider}</Typography>
                                                            </MuiStack>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {deliveryType === 'home' ? rate.homeDeliveryPrice : rate.stopDeskPrice} DZD
                                                            </Typography>
                                                        </MuiStack>
                                                    </MenuItem>
                                                ))}
                                            </MuiSelect>
                                        </MuiFormControl>
                                    ) : ( // Radio button mode
                                        <MuiFormControl component="fieldset">
                                            <FormLabel component="legend">Select Delivery Company</FormLabel>
                                            <RadioGroup value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                                                {availableCompanies.map((rate, index) => (
                                                    <FormControlLabel
                                                        key={`${rate.apiProvider}-${index}`}
                                                        value={rate.apiProvider}
                                                        control={<MuiRadio />}
                                                        label={
                                                            <MuiStack direction="row" alignItems="center" spacing={1.5} width="100%">
                                                                <MuiStack direction="row" alignItems="center" spacing={1} flexGrow={1}>
                                                                    {rate.apiProvider !== 'manual' && LOGO_URLS[rate.apiProvider as LogoKey] && (
                                                                        <img src={LOGO_URLS[rate.apiProvider as LogoKey]} alt={`${rate.apiProvider} logo`} style={{ height: '24px', width: 'auto', maxWidth: '70px', objectFit: 'contain' }} />
                                                                    )}
                                                                    <Typography variant="body2">{rate.apiProvider === 'manual' ? 'Manual Rate' : rate.apiProvider}</Typography>
                                                                </MuiStack>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {deliveryType === 'home' ? rate.homeDeliveryPrice : rate.stopDeskPrice} DZD
                                                                </Typography>
                                                            </MuiStack>
                                                        }
                                                    />
                                                ))}
                                            </RadioGroup>
                                        </MuiFormControl>
                                    )
                                ) : (
                                    <Banner tone="warning"><p>No configured delivery companies are available for the selected Wilaya.</p></Banner>
                                )
                            )}

                            {/* Show available rates when company selection is disabled */}
                            {!enableCompanySelection && availableCompanies.length > 0 && (
                                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Available Shipping Options:</Typography>

                                    {availableCompanies.map((rate, index) => (
                                        <Typography key={`available-${index}`} variant="body2" sx={{ color: 'text.secondary' }}>
                                            • {rate.apiProvider === 'manual' ? 'Manual Rate' : rate.apiProvider}: {deliveryType === 'home' ? rate.homeDeliveryPrice : rate.stopDeskPrice} DZD
                                        </Typography>
                                    ))}
                                </MuiBox>
                            )}
                        </MuiStack>
                    )}
                </MuiBox>
            );
        }
        // CORRECTED: Case for 'logistics-delivery' with all logic and state moved inside
        case 'logistics-delivery': {
            // This is a configuration field and should not be visible in the form preview.
            // Its data is used by the 'shipping-rates' field.
            return null;
        }

        // ⬇️ UPDATED BLOCK STARTS HERE ⬇️
        case 'first-name':
        case 'last-name':
        case 'email':
        case 'order-note':
        case 'phone':
        case 'address2':
        case 'province':
        case 'zip-code':
        case 'custom-text-input':
        case 'custom-password-field': {
            const hasPrefix = s.prefixText && s.prefixText.length > 0;
            const hasIcon = s.showIcon;

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                let newValue = e.target.value;
                if (field.type === 'custom-text-input' && s.allowOnlyNumbers) {
                    newValue = newValue.replace(/\D/g, '');
                }
                setFormValues(prev => ({ ...prev, [field.id]: newValue }));
            };

            const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
                handleValidation(field, e.target.value);
            };

            return (
                <MuiBox>
                    <MuiTextField
                        fullWidth
                        variant="outlined"
                        type={field.type === 'custom-password-field' && !passwordVisible ? 'password' : 'text'}
                        inputMode={(field.type === 'custom-text-input' && s.allowOnlyNumbers) || field.type === 'phone' ? 'numeric' : 'text'}
                        label={formStyle.hideFieldLabels ? '' : s.label}
                        placeholder={s.placeholder || s.label}
                        required={s.required}
                        error={!!error}
                        helperText={error}
                        value={value || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        inputProps={{
                            minLength: s.minLength,
                            maxLength: s.maxLength,
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                                },
                                '&.Mui-focused': {
                                    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25)'
                                }
                            }
                        }}
                        InputProps={{
                            startAdornment: (hasIcon || hasPrefix) ? (
                                <InputAdornment position="start">
                                    <MuiStack direction="row" spacing={1} alignItems="center">
                                        {hasIcon && <div style={{ color: '#6366f1' }}>{iconMap[field.type]}</div>}
                                        {hasPrefix && <Typography sx={{ fontWeight: 500, color: 'text.secondary' }}>{s.prefixText}</Typography>}
                                    </MuiStack>
                                </InputAdornment>
                            ) : null,
                            endAdornment: field.type === 'custom-password-field' ? (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setPasswordVisible(prev => !prev)} edge="end">
                                        {passwordVisible ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ) : null
                        }}
                    />
                </MuiBox>
            );
        }
        // ⬆️ UPDATED BLOCK ENDS HERE ⬆️

        case 'custom-image':
            return (
                <MuiBox>
                    <MuiBox
                        sx={{
                            textAlign: 'center',
                            mb: 3,
                            width: `${s.imageSize || 100}%`,
                            marginX: 'auto',
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: `${formStyle.borderRadius}px`,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                                transition: 'all 0.3s ease',
                            },
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            padding: 0,
                            margin: '0 auto',
                        }}
                    >
                        <img
                            src={cleanUrl(s.imageUrl)}
                            alt="Custom"
                            style={{
                                width: '100%',
                                height: 'auto',
                                aspectRatio: s.aspectRatio || 'auto',
                                objectFit: 'cover',
                                display: 'block',
                                borderRadius: `${formStyle.borderRadius}px`,
                                transition: 'transform 0.3s ease',
                                backgroundColor: 'transparent',
                                mixBlendMode: 'multiply',
                                border: 'none',
                                outline: 'none',
                                padding: 0,
                                margin: 0,
                                verticalAlign: 'top',
                                boxSizing: 'border-box',
                                filter: 'contrast(1.1)',
                            }}
                            loading="lazy"
                            onLoad={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                const img = e.currentTarget;
                                img.style.backgroundColor = 'transparent';
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    canvas.width = img.naturalWidth;
                                    canvas.height = img.naturalHeight;
                                    ctx.drawImage(img, 0, 0);
                                }
                            }}
                        />
                    </MuiBox>
                </MuiBox>
            );

        case 'quantity-selector': {
            const s = field.settings as QuantitySelectorSettings;
            const alignmentStyle: React.CSSProperties = {
                display: 'flex',
                justifyContent: s.alignment || 'left',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
            };



            const inputStyle: React.CSSProperties = {
                border: 'none',
                outline: 'none',
                textAlign: 'center' as const,
                fontSize: '16px',
                fontWeight: '600',
                color: '#2d3748',
                background: 'transparent',
                width: '50px',
                padding: '8px 4px',
                borderRadius: '6px',
                transition: 'background-color 0.2s ease',
            };

            const labelStyle: React.CSSProperties = {
                fontWeight: 600,
                color: formStyle.textColor || '#2d3748',
                fontSize: '14px',
                letterSpacing: '0.025em',
                flexShrink: 0,
                userSelect: 'none' as const,
            };



            return (
                <MuiBox>
                    <div style={alignmentStyle}>
                        {!formStyle.hideFieldLabels && (
                            <Typography
                                component="label"
                                htmlFor={field.id}
                                sx={labelStyle}
                            >
                                {s.label}
                                {s.required && (
                                    <span style={{ color: '#e53e3e', marginLeft: '4px' }}>*</span>
                                )}
                            </Typography>
                        )}

                        <input
                            type="number"
                            id={field.id}
                            value={String(previewData.productQuantity)}
                            min="1"
                            step="1"
                            style={{
                                ...inputStyle,
                                width: '60px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                padding: '6px 8px',
                                background: '#ffffff',
                                fontSize: '14px',
                                height: '32px',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                transition: 'all 0.2s ease-in-out',
                            }}
                            onFocus={(e: any) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                e.target.style.backgroundColor = '#ffffff';
                            }}
                            onBlur={(e: any) => {
                                e.target.style.borderColor = '#d1d5db';
                                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                e.target.style.backgroundColor = '#ffffff';
                            }}
                            aria-label="Product quantity"
                        />


                        {s.helpText && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: '#718096',
                                    fontSize: '12px',
                                    fontStyle: 'italic',
                                    marginTop: '4px',
                                    width: '100%',
                                }}
                            >
                                {s.helpText}
                            </Typography>
                        )}
                    </div>
                </MuiBox>
            );
        }
        case 'subscribe':
            return (<MuiBox><div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}><FormControlLabel control={<MuiCheckbox checked={value ?? s.preselect} onChange={(e) => setFormValues(p => ({ ...p, [field.id]: e.target.checked }))} sx={{ color: '#6366f1', '&.Mui-checked': { color: '#6366f1' }, '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.1)' } }} />} label={<Typography sx={{ color: formStyle.textColor, fontWeight: 500 }}>Subscribe to stay updated with <MuiLink href="#" target="_blank" rel="noopener noreferrer" sx={{ color: '#6366f1', fontWeight: '600', textDecoration: 'underline' }}>new products and offers!</MuiLink></Typography>} /></div></MuiBox>);
        case 'terms':
            return (<MuiBox><div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}><FormControlLabel control={<MuiCheckbox checked={!!value} onChange={(e) => setFormValues(p => ({ ...p, [field.id]: e.target.checked }))} required={s.required} sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }} />} label={<Typography sx={{ color: formStyle.textColor }}>Accept our <MuiLink href={(s as TermsSettings).termsUrl || '#'} target="_blank" sx={{ color: '#10b981', fontWeight: '600', textDecoration: 'underline' }}>terms and conditions</MuiLink></Typography>} /></div></MuiBox>);
        case 'custom-dropdown':
            const options = s.values ? s.values.split(',').map((opt: string) => opt.trim()) : [];
            return (<MuiBox><MuiFormControl fullWidth error={!!error} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', transition: 'all 0.3s ease', '&:hover': { boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)' }, '&.Mui-focused': { boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25)' } } }}><InputLabel sx={{ fontWeight: 500 }}>{s.label}</InputLabel><MuiSelect value={value || ''} onChange={(e) => setFormValues(p => ({ ...p, [field.id]: e.target.value }))} label={s.label}><MenuItem disabled value=""><em style={{ color: '#9ca3af' }}>{s.placeholder}</em></MenuItem>
                {options.map((opt: string) => (<MenuItem key={opt} value={opt} sx={{ '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.1)' } }}>{opt}</MenuItem>))}
            </MuiSelect>{error && <FormHelperText>{error}</FormHelperText>}</MuiFormControl></MuiBox>);
        case 'custom-single-choice': {
            const choices = s.values ? s.values.split(',').map((opt: string) => opt.trim()) : [];
            const defaultValue = s.preselectFirst && choices.length > 0 ? choices[0] : '';

            return (
                <MuiBox>
                    <MuiFormControl component="fieldset" error={!!error}>
                        {!formStyle.hideFieldLabels && (
                            <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1, color: formStyle.textColor }}>
                                {s.label}
                            </FormLabel>
                        )}
                        <RadioGroup
                            name={field.id}
                            value={value || defaultValue}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setFormValues(p => ({ ...p, [field.id]: newValue }));
                                handleValidation(field, newValue);
                            }}
                        >
                            {choices.map((opt: string) => (
                                <FormControlLabel key={opt} value={opt} control={<MuiRadio />} label={opt} />
                            ))}
                        </RadioGroup>
                        {error && <FormHelperText>{error}</FormHelperText>}
                    </MuiFormControl>
                </MuiBox>
            );
        }
        case 'custom-checkbox':
            return (<MuiBox><div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}><FormControlLabel control={<MuiCheckbox checked={!!value} onChange={(e) => setFormValues(p => ({ ...p, [field.id]: e.target.checked }))} sx={{ color: '#6366f1', '&.Mui-checked': { color: '#6366f1' } }} />} label={<Typography sx={{ color: formStyle.textColor, fontWeight: 500 }}>{s.label}</Typography>} /></div></MuiBox>);
        case 'custom-date-selector':
            return (<MuiBox><div style={{ position: 'relative' }}>{!formStyle.hideFieldLabels && (<label style={{ display: 'block', marginBottom: 'var(--p-space-200)', color: formStyle.textColor, fontWeight: '500', fontSize: '14px' }}>{s.label}</label>)}<input type="date" placeholder={s.placeholder} required={s.required} style={{ width: '100%', padding: 'var(--p-space-400)', paddingRight: s.showIcon ? 'var(--p-space-1000)' : 'var(--p-space-400)', border: `${formStyle.borderWidth}px solid ${formStyle.borderColor}`, borderRadius: '12px', color: formStyle.textColor, backgroundColor: 'rgba(255,255,255,0.8)', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: '1.5', transition: 'all 0.3s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', } as any} />{s.showIcon && (<div style={{ position: 'absolute', right: 'var(--p-space-400)', top: formStyle.hideFieldLabels ? '50%' : `calc(50% + 12px)`, transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6366f1' }}><Icon source={CalendarIcon} tone="base" /></div>)}</div></MuiBox>);
        case 'submit':
            return renderButton(s, 'submit');
        case 'custom-link-button':
            return renderButton(s, 'link', s.buttonUrl);
        case 'custom-whatsapp-button': {
            const s = field.settings as WhatsappButtonSettings;
            const WhatsappIcon = () => (
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ marginRight: '4px' }}
                >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.188z" />
                </svg>
            );

            const processMessage = (msg: string) =>
                msg.replace(/{page_url}/g, 'https://your-store.com/product-page')
                    .replace(/{products_summary_with_quantity}/g, `1x ${previewData.productName}`)
                    .replace(/{order_total}/g, previewData.total)
                    .replace(/{full_name}/g, 'John Doe')
                    .replace(/{phone}/g, '555-1234')
                    .replace(/{email}/g, 'john.doe@example.com')
                    .replace(/{full_address}/g, '123 Main St, Anytown')
                    .replace(/{order_note}/g, 'This is a sample note.');

            const whatsappUrl = `https://wa.me/${s.whatsappPhoneNumber}?text=${encodeURIComponent(processMessage(s.prefilledMessage))}`;

            const buttonStyle: React.CSSProperties = {
                backgroundColor: s.backgroundColor,
                color: s.textColor,
                borderColor: s.borderColor,
                fontSize: `${s.fontSize}px`,
                borderRadius: `${s.borderRadius}px`,
                borderWidth: `${s.borderWidth}px`,
                boxShadow: s.shadow ? `0 2px 4px rgba(0,0,0,0.${s.shadow})` : 'none',
                borderStyle: 'solid',
                padding: '12px 24px',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                lineHeight: 1.2,
            };

            return (
                <a href={whatsappUrl} style={buttonStyle} target="_blank" rel="noopener noreferrer">
                    <WhatsappIcon />
                    <div>
                        <div>{s.buttonText || 'Order on WhatsApp'}</div>
                        {s.buttonSubtitle && (
                            <div style={{ fontSize: '0.8em', opacity: 0.8 }}>
                                {s.buttonSubtitle}
                            </div>
                        )}
                    </div>
                </a>
            );
        }
        case 'custom-icon-feature': {
            const s = field.settings as CustomIconFeatureSettings;
            const enabledFeatures = s.features.filter(f => f.enabled);

            if (enabledFeatures.length === 0) {
                return (
                    <MuiBox sx={{
                        my: 3,
                        py: 4,
                        px: 3,
                        border: '2px dashed #E0E4E7',
                        borderRadius: '12px',
                        textAlign: 'center',
                        backgroundColor: '#FAFBFB'
                    }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
                            Trust Badges Field
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                            Enable badges in settings to see preview
                        </Typography>
                    </MuiBox>
                );
            }

            const titleMarkup = s.title && (
                <Typography
                    variant="h6"
                    component="h3"
                    textAlign="center"
                    sx={{
                        mb: s.titlePosition === 'top' ? 3 : 0,
                        mt: s.titlePosition === 'bottom' ? 3 : 0,
                        fontWeight: 600,
                        color: formStyle.textColor || '#1F2937',
                        fontSize: '18px',
                        lineHeight: 1.4,
                        letterSpacing: '-0.01em',
                        position: 'relative',
                        '&::after': s.titlePosition === 'top' ? {
                            content: '""',
                            position: 'absolute',
                            bottom: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '40px',
                            height: '2px',
                            backgroundColor: formStyle.primaryColor || '#3B82F6',
                            borderRadius: '1px'
                        } : {}
                    }}
                >
                    {s.title}
                </Typography>
            );

            const getLayoutStyles = (): React.CSSProperties => {
                const layout = s.layout || 'auto';
                const count = enabledFeatures.length;

                if (count === 1) {
                    return {
                        display: 'flex',
                        justifyContent: 'center',
                        maxWidth: '200px',
                        margin: '0 auto'
                    };
                }

                if (count === 2) {
                    return {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '16px',
                        maxWidth: '400px',
                        margin: '0 auto'
                    };
                }

                if (count === 3) {
                    if (layout === 'triangle') {
                        return {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '24px',
                            maxWidth: '400px',
                            margin: '0 auto'
                        };
                    } else {
                        return {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '24px',
                            maxWidth: '600px',
                            margin: '0 auto'
                        };
                    }
                }

                return {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '16px',
                    margin: '0 auto'
                };
            };

            function renderBadge(feature: any, index: number) {
                return (
                    <MuiBox
                        key={index}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            p: 2.5,
                            borderRadius: '16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #F3F4F6',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            transform: 'translateY(-2px)',
                            borderColor: formStyle.primaryColor || '#3B82F6',
                            position: 'relative',
                            minHeight: '140px',
                            justifyContent: 'center'
                        }}
                    >
                        <MuiBox sx={{
                            width: '64px',
                            height: '64px',
                            mb: 2,
                            borderRadius: '12px',
                            overflow: 'hidden',
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img
                                src={feature.imageUrl}
                                alt={feature.caption}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    objectFit: 'contain'
                                }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = `
                                        <div style="
                                            width: 48px; 
                                            height: 48px; 
                                            background: #E5E7EB; 
                                            border-radius: 8px;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            font-size: 20px;
                                            color: #9CA3AF;
                                        ">
                                            🖼️
                                        </div>
                                    `;
                                    }
                                }}
                            />
                        </MuiBox>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 500,
                                color: formStyle.textColor || '#374151',
                                lineHeight: 1.4,
                                fontSize: '14px',
                                textAlign: 'center',
                                maxWidth: '100%',
                                wordBreak: 'break-word'
                            }}
                        >
                            {feature.caption}
                        </Typography>
                    </MuiBox>
                );
            }

            const iconsMarkup = (
                <MuiBox style={getLayoutStyles()}>
                    {enabledFeatures.length === 3 && s.layout === 'triangle' ? (
                        <>
                            <MuiBox sx={{ display: 'flex', justifyContent: 'center' }}>
                                {renderBadge(enabledFeatures[0], 0)}
                            </MuiBox>
                            <MuiBox sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '24px',
                                maxWidth: '400px'
                            }}>
                                {renderBadge(enabledFeatures[1], 1)}
                                {renderBadge(enabledFeatures[2], 2)}
                            </MuiBox>
                        </>
                    ) : (
                        enabledFeatures.map((feature, index) => renderBadge(feature, index))
                    )}
                </MuiBox>
            );

            return (
                <MuiBox sx={{
                    my: 4,
                    py: 4,
                    px: 3,
                    borderRadius: '16px',
                    backgroundColor: '#FAFBFC',
                    border: '1px solid #E5E7EB'
                }}>
                    {s.titlePosition === 'top' && titleMarkup}
                    {iconsMarkup}
                    {s.titlePosition === 'bottom' && titleMarkup}
                </MuiBox>
            );
        }

        case 'shopify-checkout-button':
            return renderButton(s, 'submit');

        default: return null;
    }
});


const FormFieldsGrid: React.FC<{
    formFields: FormField[];
    formStyle: FormStyle;
    formValues: Record<string, any>;
    formErrors: Record<string, string | undefined>;
    previewData: any;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    handleValidation: (field: FormField, value: any) => void;
    passwordVisible: boolean;
    setPasswordVisible: React.Dispatch<React.SetStateAction<boolean>>;
    allWilayas: AlgeriaLocation[];
    shippingRates: ShippingRate[];
}> = ({
    formFields,
    formStyle,
    formValues,
    formErrors,
    previewData,
    setFormValues,
    handleValidation,
    passwordVisible,
    setPasswordVisible,
    allWilayas,
    shippingRates,
}) => {
    const fieldNodes: React.ReactNode[] = [];
    const enabledFields = formFields.filter(f => f.enabled);

    const getFieldProps = (field: FormField) => ({
        field,
        allFormFields: formFields,
        formStyle,
        formValues,
        formErrors,
        previewData,
        setFormValues,
        handleValidation,
        passwordVisible,
        setPasswordVisible,
        allWilayas,
        shippingRates
    });

    for (let i = 0; i < enabledFields.length; i++) {
        const field = enabledFields[i];
        const s = field.settings as any;
        const isButton = field.type.includes('button') || field.type === 'submit';

        if (isButton && s.layout === 'half-left' && i + 1 < enabledFields.length) {
            const nextField = enabledFields[i + 1];
            const next_s = nextField.settings as any;
            const nextIsButton = nextField.type.includes('button') || nextField.type === 'submit';

            if (nextIsButton && next_s.layout === 'half-right') {
                fieldNodes.push(
                    <MuiBox key={`${field.id}-${nextField.id}`} sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <PreviewField isEditingPopupButton={false} {...getFieldProps(field)} />
                        <PreviewField isEditingPopupButton={false} {...getFieldProps(nextField)} />
                    </MuiBox>
                );
                i++;
                continue;
            }
        }

        const isFullWidthByOverride = (s.layoutOverride === 'single');
        const isFullWidthByType = new Set(['header', 'section-header', 'summary', 'totals-summary', 'shipping-rates', 'discount-codes', 'custom-title', 'custom-image', 'subscribe', 'terms', 'logistics-delivery', 'custom-icon-feature']).has(field.type);
        const isFullWidthButton = isButton && s.layout !== 'half-left' && s.layout !== 'half-right';
        const isFullWidth = isFullWidthByOverride || isFullWidthByType || isFullWidthButton;

        fieldNodes.push(
            <MuiBox key={field.id} sx={{ gridColumn: (formStyle.layout === 'double' && !isFullWidth) ? 'span 1' : '1 / -1' }}>
                <PreviewField isEditingPopupButton={false} {...getFieldProps(field)} />
            </MuiBox>
        );
    }
    // ⬇️ UPDATED BLOCK STARTS HERE ⬇️
    return (
        <MuiBox sx={{
            display: 'grid',
            gridTemplateColumns: formStyle.layout === 'double' ? 'repeat(2, 1fr)' : '1fr',
            alignItems: 'start',
            columnGap: 2,
            rowGap: 1.5, // Increased gap for better spacing
            padding: '8px' // Add some padding
        }}>
            {fieldNodes}
        </MuiBox>
    );
    // ⬆️ UPDATED BLOCK ENDS HERE ⬆️
};

const PreviewForm: React.FC<{
    formFields: FormField[];
    formStyle: FormStyle;
    formValues: Record<string, any>;
    formErrors: Record<string, string | undefined>;
    handleSubmit: (e: React.FormEvent) => void;
    previewData: any;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    handleValidation: (field: FormField, value: any) => void;
    passwordVisible: boolean;
    setPasswordVisible: React.Dispatch<React.SetStateAction<boolean>>;
    allWilayas: AlgeriaLocation[];
    shippingRates: ShippingRate[];
    isEditingPopupButton: boolean;
}> = (props) => {
    const { formStyle, handleSubmit, isEditingPopupButton } = props;
    const formMode = formStyle.mode || 'embedded';
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!previewRef.current) return;
        const root = previewRef.current;
        root.style.setProperty('--border-radius', `${formStyle.borderRadius}px`);
        root.style.setProperty('--border-width', `${formStyle.borderWidth}px`);
        root.style.setProperty('--font-size', `${formStyle.fontSize}px`);
        root.style.setProperty('--text-color', formStyle.textColor);
        root.style.setProperty('--bg-color', safeColor(formStyle.backgroundColor));
        root.style.setProperty('--border-color', formStyle.borderColor);
    }, [formStyle]);

    if (!props.formFields || !Array.isArray(props.formFields)) {
        return <div>Loading form fields...</div>;
    }

    // --- POPUP MODE LOGIC ---
    if (formMode === 'popup') {
        // Render the popup button preview if the button editor is active
        if (isEditingPopupButton) {
            const buttonSettings = formStyle.popupButtonSettings!;
            const animClass = buttonSettings.animation && buttonSettings.animation !== 'none' ? `btn-anim-${buttonSettings.animation}` : '';

            const getPlacement = () => {
                switch (buttonSettings.placement) {
                    case 'left': return 'flex-start';
                    case 'right': return 'flex-end';
                    default: return 'center';
                }
            };

            const buttonContainerSx = {
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: getPlacement(),
                p: 3,
                border: '1px dashed #ccc',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                ...(buttonSettings.followUser && {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 'auto',
                    minHeight: 'auto',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid #e0e0e0'
                })
            };

            return (
                <MuiBox sx={buttonContainerSx}>
                    <MuiButton
                        variant="contained"
                        className={animClass}
                        sx={{
                            px: 4,
                            py: 1.5,
                            fontSize: `${buttonSettings.fontSize}px`,
                            fontWeight: 600,
                            borderRadius: `${buttonSettings.borderRadius}px`,
                            textTransform: 'none',
                            backgroundColor: buttonSettings.backgroundColor,
                            color: buttonSettings.textColor,
                            boxShadow: muiTheme.shadows[buttonSettings.shadow] || 'none',
                            border: buttonSettings.borderWidth ? `${buttonSettings.borderWidth}px solid ${buttonSettings.borderColor}` : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                backgroundColor: buttonSettings.backgroundColor,
                                filter: 'brightness(1.1)',
                            },
                        }}
                    >
                        <MuiStack direction="row" spacing={1} alignItems="center">
                            <span>{buttonSettings.buttonText}</span>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px'
                            }}>
                                ↗
                            </div>
                        </MuiStack>
                    </MuiButton>
                </MuiBox>
            );
        }

        // --- Render the actual popup form preview if not editing the button ---
        const popupOverlaySx = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0, 0, 0, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', boxSizing: 'border-box', zIndex: 1000, overflowY: 'auto' };
        const formContainerSx = { width: '100%', maxWidth: '480px', maxHeight: 'none', display: 'flex', flexDirection: 'column', position: 'relative', borderRadius: `${formStyle.borderRadius}px`, border: `${formStyle.borderWidth}px solid ${formStyle.borderColor}`, background: safeColor(formStyle.backgroundColor), boxShadow: muiTheme.shadows[formStyle.shadow] || 'none', color: formStyle.textColor, fontSize: `${formStyle.fontSize}px`, direction: formStyle.enableRTL ? 'rtl' : 'ltr', overflow: 'hidden', flexShrink: 0 };
        const closeButtonSx = { position: 'absolute', top: 8, right: formStyle.enableRTL ? 'auto' : 8, left: formStyle.enableRTL ? 8 : 'auto', color: formStyle.textColor || '#666', bgcolor: 'rgba(255, 255, 255, 0.9)', width: 28, height: 28, zIndex: 10, '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' } };
        const formContentSx = { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' };
        const formFieldsSx = { flex: 1, overflowY: 'auto', p: 3, paddingTop: '40px' };
    
        return (
            <MuiBox sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
                <style>{`#preview-root { font-size: var(--font-size); } .sortable-field { transition: all 0.2s ease; }`}</style>
                <MuiBox sx={popupOverlaySx}>
                    <MuiBox sx={{ height: '20px', width: '100%', flexShrink: 0 }} />
                    <MuiBox
                        component="form"
                        onSubmit={handleSubmit}
                        sx={formContainerSx}
                        style={{ fontFamily: muiTheme.typography.fontFamily }}
                        onClick={(e) => e.stopPropagation()}
                        ref={previewRef}
                        id="preview-root"
                    >
                        {!formStyle.hideCloseButton && (<IconButton sx={closeButtonSx} aria-label="Close form" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('Close popup'); }}><Close fontSize="small" /></IconButton>)}
                        <MuiBox sx={formContentSx}>
                            <MuiBox sx={formFieldsSx}>
                                <FormFieldsGrid {...props} />
                            </MuiBox>
                        </MuiBox>
                    </MuiBox>
                    <MuiBox sx={{ height: '20px', width: '100%', flexShrink: 0 }} />
                </MuiBox>
            </MuiBox>
        );
    }

    // --- EMBEDDED MODE LOGIC ---
    if (formMode === 'embedded') {
        const embeddedFormContainerSx = { width: '100%', height: '100%', overflowY: 'auto', borderRadius: 'var(--border-radius)', border: 'var(--border-width) solid ' + formStyle.borderColor, background: safeColor(formStyle.backgroundColor), boxShadow: muiTheme.shadows[formStyle.shadow], color: formStyle.textColor, fontSize: 'var(--font-size)', direction: formStyle.enableRTL ? 'rtl' : 'ltr' };
        const embeddedFormContentSx = { p: 3, minHeight: '100%' };
        return (
            <MuiBox sx={{ width: '100%', height: '100%' }}>
                <style>{`#preview-root { font-size: var(--font-size); } .sortable-field { transition: all 0.2s ease; }`}</style>
                <MuiBox component="form" ref={previewRef} onSubmit={handleSubmit} sx={embeddedFormContainerSx} id="preview-root">
                    <MuiBox sx={embeddedFormContentSx}>
                        <FormFieldsGrid {...props} />
                    </MuiBox>
                </MuiBox>
            </MuiBox>
        );
    }

    return null; // Fallback
};

const SortableFieldWrapper = ({ id, field, formStyle, children }: {
    id: string;
    field: FormField;
    formStyle: FormStyle;
    children: (listeners: any) => React.ReactNode
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        data: { type: 'field' },
    });

    const isFullWidth = new Set([
        'header', 'section-header', 'summary', 'totals-summary',
        'submit', 'custom-link-button', 'custom-whatsapp-button',
        'shopify-checkout-button', 'custom-image', 'quantity-selector',
        'logistics-delivery',
        'custom-icon-feature'
    ]).has(field.type) || (field.settings as BaseFieldSettings & { layoutOverride?: string }).layoutOverride === 'single';

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        gridColumn: (field.settings as BaseFieldSettings & { layoutOverride?: string }).layoutOverride === 'single' ? '1 / -1' :
            formStyle.layout === 'double' && !isFullWidth ? 'span 1' : 'span 2',
        zIndex: isDragging ? 1000 : 'auto',
        willChange: 'transform',
        opacity: isDragging ? 0 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="sortable-field"
        >
            {children(listeners)}
        </div>
    );
};

const LogisticsSettingsEditor: React.FC<{
    field: FormField;
    onSettingsChange: (fieldId: string, newSettings: Partial<AllFieldSettings>) => void;
    onCancel: () => void;
    onImportRates: () => void;
    isImporting: boolean;
}> = ({ field, onSettingsChange, onCancel, onImportRates, isImporting }) => {
    const s = field.settings as LogisticsDeliverySettings;

    const handleFieldChange = useCallback((value: string, id: string) => {
        if (id === 'apiProvider') {
            onSettingsChange(field.id, {
                apiProvider: value as LogisticsDeliverySettings['apiProvider'],
                apiToken: '',
                apiKey: '',
                userGuid: '',
                apiUrl: ''
            });
        } else {
            onSettingsChange(field.id, { [id]: value });
        }
    }, [onSettingsChange, field.id]);

    const providers = [
        { value: 'noest', label: 'Noest Delivery', logo: LOGO_URLS.noest },
        { value: 'zrexpress', label: 'ZR Express', logo: LOGO_URLS.zrexpress },
        { value: 'procolis', label: 'COLIRELI/Procolis', logo: LOGO_URLS.procolis },
        { value: 'dhd', label: 'DHD', logo: LOGO_URLS.dhd },
        { value: 'anderson', label: 'Anderson Delivery', logo: LOGO_URLS.anderson },
        { value: 'maystro', label: 'Maystro Delivery', logo: LOGO_URLS.maystro },
        { value: 'areex', label: 'Areex', logo: LOGO_URLS.areex },
        { value: 'baconsult', label: 'BA Consult', logo: LOGO_URLS.baconsult },
        { value: 'conexlog', label: 'Conexlog', logo: LOGO_URLS.conexlog },
        { value: 'coyoteexpress', label: 'Coyote Express', logo: LOGO_URLS.coyoteexpress },
        { value: 'distazero', label: 'Distazero', logo: LOGO_URLS.distazero },
        { value: '48hr', label: '48Hr Livraison', logo: LOGO_URLS['48hr'] },
        { value: 'fretdirect', label: 'FRET.Direct', logo: LOGO_URLS.fretdirect },
        { value: 'golivri', label: 'GOLIVRI', logo: LOGO_URLS.golivri },
        { value: 'msmgo', label: 'MSM Go', logo: LOGO_URLS.msmgo },
        { value: 'packers', label: 'Packers', logo: LOGO_URLS.packers },
        { value: 'prest', label: 'Prest', logo: LOGO_URLS.prest },
        { value: 'rex', label: 'Rex Livraison', logo: LOGO_URLS.rex },
        { value: 'rocket', label: 'Rocket Delivery', logo: LOGO_URLS.rocket },
        { value: 'salva', label: 'Salva Delivery', logo: LOGO_URLS.salva },
        { value: 'speed', label: 'Speed Delivery', logo: LOGO_URLS.speed },
        { value: 'tsl', label: 'TSL Express', logo: LOGO_URLS.tsl },
        { value: 'ecotrack', label: 'ECOTRACK', logo: LOGO_URLS.ecotrack },
    ];

    const otherEcotrackProviders = [
        'anderson', 'areex', 'baconsult', 'conexlog', 'coyoteexpress',
        'distazero', '48hr', 'fretdirect', 'golivri', 'msmgo', 'packers',
        'prest', 'rex', 'rocket', 'salva', 'speed', 'tsl'
    ];
    
    const isImportDisabled = () => {
        if (!s.apiToken) return true;
        if (s.apiProvider === 'noest' && !s.userGuid) return true;
        if (s.apiProvider === 'ecotrack' && !s.apiUrl) return true;
        if ((s.apiProvider === 'zrexpress' || s.apiProvider === 'procolis') && !s.apiKey) return true;
        return false;
    };

    return (
        <MuiCollapse in={true} timeout="auto" unmountOnExit>
            <div style={{ padding: '16px', border: '1px solid #dfe3e8', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Configure API & Import Rates</h3>

                    <MuiFormControl fullWidth>
                        <InputLabel>Delivery Company</InputLabel>
                        <MuiSelect
                            value={s.apiProvider || 'manual'}
                            label="Delivery Company"
                            onChange={(e) => handleFieldChange(e.target.value as string, 'apiProvider')}
                        >
                            {providers.map(p => (
                                <MenuItem key={p.value} value={p.value}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {p.logo && <img src={p.logo} alt={`${p.label} Logo`} style={{ height: '40px', maxWidth: '100px', objectFit: 'contain' }} />}
                                        <span>{p.label}</span>
                                    </div>
                                </MenuItem>
                            ))}
                        </MuiSelect>
                    </MuiFormControl>

                    {s.apiProvider !== 'manual' && (
                        <>
                            <TextField id="apiToken" label="API Token" value={s.apiToken || ''} onChange={(value) => handleFieldChange(value, 'apiToken')} autoComplete="off" requiredIndicator helpText="Provided by your delivery company." />
                            {(s.apiProvider === 'zrexpress' || s.apiProvider === 'procolis') && (<TextField id="apiKey" label="API Key" value={s.apiKey || ''} onChange={(value) => handleFieldChange(value, 'apiKey')} autoComplete="off" requiredIndicator helpText="The API Key provided by your delivery company." />)}
                            {s.apiProvider === 'noest' && (<TextField id="userGuid" label="User GUID" value={s.userGuid || ''} onChange={(value) => handleFieldChange(value, 'userGuid')} autoComplete="off" requiredIndicator helpText="Required only for Noest." />)}
                            {(s.apiProvider === 'ecotrack' || otherEcotrackProviders.includes(s.apiProvider)) && (<TextField id="userGuid" label="User GUID (Optional)" value={s.userGuid || ''} onChange={(value) => handleFieldChange(value, 'userGuid')} autoComplete="off" helpText="Only required by some delivery services." />)}
                            {s.apiProvider === 'ecotrack' && (<TextField id="apiUrl" label="API URL" value={s.apiUrl || ''} onChange={(value) => handleFieldChange(value, 'apiUrl')} autoComplete="off" requiredIndicator placeholder="https://app.company.dz" helpText="The specific API URL for your Ecotrack-based provider." />)}
                        </>
                    )}

                    {s.apiProvider === 'manual' && (
                        <div style={{ border: '1px solid #c9ced3', borderRadius: '8px', padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Manual Delivery Rates</h4>
                                <Button onClick={() => console.log('File upload functionality not implemented.')} icon={ImportIcon}>Upload CSV/XLSX</Button>
                                <p style={{ fontSize: '12px', color: '#6d7175', margin: 0 }}>Upload a file with columns: Wilaya ID, Wilaya Name, Home Delivery Price, Stop Desk Price</p>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <ButtonGroup>
                            {s.apiProvider !== 'manual' && (
                                <Button variant="primary" onClick={onImportRates} loading={isImporting} disabled={isImporting || isImportDisabled()} icon={ImportIcon}>
                                    Import Rates from {providers.find(p => p.value === s.apiProvider)?.label || 'Provider'}
                                </Button>
                            )}
                            <Button onClick={onCancel}>Done</Button>
                        </ButtonGroup>
                    </div>
                </div>
            </div>
        </MuiCollapse>
    );
};
// Updated fetchCommunesForWilaya function
const fetchCommunesForWilaya = async (wilayaId: string): Promise<AlgeriaLocation[]> => {
  try {
    console.log(`Fetching communes for wilaya ID: ${wilayaId}`);
    
    const response = await fetch(`/api/algeria-locations?wilaya_id=${encodeURIComponent(wilayaId)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Received data:`, data);
    
    if (data.error) {
      console.error("API returned error:", data.error);
      throw new Error(data.error);
    }
    
    if (!Array.isArray(data)) {
      console.error("API returned non-array data:", data);
      throw new Error("Invalid data format received from API");
    }
    
    console.log(`Successfully fetched ${data.length} communes`);
    return data;
  } catch (error) {
    console.error('Failed to fetch communes:', error);
    throw error;
  }
};
// --- PARENT COMPONENT TO HOST AND DEMONSTRATE THE EDITOR ---
// This is the fix. The logic and state were moved inside a valid React component.
const LogisticsConfiguration = () => {
    const [field, setField] = React.useState<FormField>({
        id: 'logistics-delivery-singleton',
        type: 'logistics-delivery',
        enabled: true,
        editable: false,
        label: 'Logistics & Delivery',
        settings: {
            title: 'Select Delivery Company',
            apiProvider: 'manual',
            apiToken: '',
            userGuid: '',
            apiUrl: '',
            apiKey: '',
            showStopDesk: true,
            showHomeDelivery: true,
            defaultDeliveryType: 'home',
            algeriaWilayaMode: 'arabic',
            algeriaCommuneMode: 'french',
            manualRates: [],
            enableCompanySelection: false,
            visibleCompanies: [],
            companySelectionMode: 'dropdown',
            allowCompanyOverride: false,
            deliveryTypeMode: 'both',
            showWilayaField: true,
            showCommuneField: true,
            wilayaFieldLabel: 'Wilaya',
            communeFieldLabel: 'Commune',
            showManualRates: true,
        } as unknown as LogisticsDeliverySettings,
    });

    const [isImporting, setIsImporting] = React.useState(false);

    const handleSettingsChange = (fieldId: string, newSettings: Partial<AllFieldSettings>) => {
    console.log('Settings changed:', fieldId, newSettings);
    setField(prevField => ({
        ...prevField,
        settings: {
            ...prevField.settings,
            ...newSettings
        }
    }));
};

    const handleImport = () => {
        console.log('Importing rates...');
        setIsImporting(true);
        setTimeout(() => {
            console.log('Import complete!');
            setIsImporting(false);
        }, 2000);
    };

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
            <h1>Logistics Configuration</h1>
            <LogisticsSettingsEditor
                field={field}
                onSettingsChange={handleSettingsChange}
                onCancel={() => console.log('Cancel clicked')}
                onImportRates={handleImport}
                isImporting={isImporting}
            />
            <pre style={{ marginTop: '20px', background: '#f0f0f0', padding: '15px', borderRadius: '8px', border: '1px solid #ccc' }}>
                <strong>Current State:</strong>
                <hr style={{margin: '10px 0'}}/>
                {JSON.stringify(field.settings, null, 2)}
            </pre>
        </div>
    );
}         
                


type RateImportFetcherData = {
    success?: boolean;
    error?: string;
    rates?: {
        wilaya_id: string | number;
        tarif: string;
        tarif_stopdesk: string;
    }[];
};

const createLogisticsField = (): FormField => ({
  id: `logistics-delivery-${Date.now()}`,
  type: 'logistics-delivery',
  label: 'Delivery Location',
  enabled: true,
  editable: true,
  settings: {
    title: 'Select Delivery Location',
    apiProvider: 'manual',
    apiToken: '',
    userGuid: '',
    apiUrl: '',
    apiKey: '', // Add apiKey
    showHomeDelivery: true,
    showStopDesk: true,
    showWilayaNumbers: true,
    defaultDeliveryType: 'home',
    algeriaWilayaMode: 'arabic',
    algeriaCommuneMode: 'arabic',
    manualRates: [],
    // Add all these missing required properties
    enableCompanySelection: false,
    visibleCompanies: [],
    companySelectionMode: 'dropdown',
    allowCompanyOverride: false,
    deliveryTypeMode: 'both',
    showWilayaField: true,
    showCommuneField: true,
    wilayaFieldLabel: 'Wilaya',
    communeFieldLabel: 'Commune',
    showManualRates: true,
    hiddenWilayas: [],
  } as LogisticsDeliverySettings,
});
const CommuneSubtable: React.FC<{ wilayaId: number | null }> = ({ wilayaId }) => {
  const [communes, setCommunes] = useState<AlgeriaLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if no wilaya is selected.
    if (!wilayaId) {
      setCommunes([]); // Clear any existing communes
      return;
    }

    // Start loading state and clear previous results/errors.
    setIsLoading(true);
    setError(null);
    setCommunes([]);

    // Fetch communes for the selected wilaya.
    fetch(`/api/algeria-locations?wilaya_id=${wilayaId}`)
      .then(res => {
        // Check for a successful HTTP response.
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // Handle potential errors returned in the JSON payload.
        if (data.error) {
          throw new Error(data.error);
        }
        setCommunes(data);
      })
      .catch(err => {
        // Catch any errors from the fetch or data processing.
        console.error("Failed to fetch communes:", err);
        setError("Could not load communes. Please try again.");
      })
      .finally(() => {
        // Always turn off loading state.
        setIsLoading(false);
      });
  }, [wilayaId]); // Dependency array ensures this effect runs only when wilayaId changes.

  // Display a loading message with a spinner.
  if (isLoading) {
    return (
      <Box padding="200">
        <LegacyStack alignment="center" spacing="tight">
          <CircularProgress size={16} />
          <Text as="p" tone="subdued">Loading communes...</Text>
        </LegacyStack>
      </Box>
    );
  }

  // Display an error message if the fetch failed.
  if (error) {
    return (
      <Box padding="200">
        <Text as="p" tone="critical">{error}</Text>
      </Box>
    );
  }

  // Display a message if no communes were found.
  if (!isLoading && communes.length === 0 && wilayaId) {
    return (
      <Box padding="200">
        <Text as="p" tone="subdued">No communes found for this wilaya.</Text>
      </Box>
    );
  }

  // Don't render anything if no wilaya is selected.
  if (!wilayaId) {
      return null;
  }

  // Render the list of communes.
  return (
    <Box>
      <Text variant="bodyMd" fontWeight="semibold" as="h4">
        Communes ({communes.length})
      </Text>
      <Box paddingBlockStart="200">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '8px',
          border: '1px solid #dfe3e8',
          borderRadius: '8px',
          backgroundColor: '#f9fafb'
        }}>
          {communes.map((commune) => (
            <div
              key={commune.id}
              style={{
                padding: '6px 8px',
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                border: '1px solid #e1e5e9'
              }}
            >
              <Text variant="bodySm" as="p">{commune.commune_name}</Text>
              <Text variant="bodySm" as="p" tone="subdued">{commune.commune_name_ascii}</Text>
            </div>
          ))}
        </div>
      </Box>
    </Box>
  );
};

/* -------------------------------------------------------------------------- */
/* Main COD Form Designer (Hybrid Orchestrator)                               */
/* -------------------------------------------------------------------------- */
// Helper function to get the cheapest rate for a wilaya across all companies
const getCheapestRateForWilaya = (
  wilayaId: number, 
  deliveryType: 'home' | 'stopdesk',
  manualRates: DeliveryRate[]
): DeliveryRate | null => {
  const availableRates = manualRates.filter(rate => rate.wilayaId === wilayaId);
  
  if (availableRates.length === 0) return null;
  
  const cheapest = availableRates.reduce((prev, current) => {
    const prevPrice = deliveryType === 'home' ? prev.homeDeliveryPrice : prev.stopDeskPrice;
    const currentPrice = deliveryType === 'home' ? current.homeDeliveryPrice : current.stopDeskPrice;
    return currentPrice < prevPrice ? current : prev;
  });
  
return cheapest;
};

// Helper function to get available companies for a wilaya
const getAvailableCompaniesForWilaya = (
  wilayaId: number,
  manualRates: DeliveryRate[],
  visibleCompanies: string[]
): { company: string; homePrice: number; stopDeskPrice: number }[] => {
  const rates = manualRates.filter(rate => 
    rate.wilayaId === wilayaId && 
    visibleCompanies.includes(rate.apiProvider || 'manual')
  );
  
  return rates.map(rate => ({
    company: rate.apiProvider || 'manual',
    homePrice: rate.homeDeliveryPrice,
    stopDeskPrice: rate.stopDeskPrice
  }));
};

function CODFormDesignerRoot() {
    const { formFields: loadedFormFields, formStyle: loadedFormStyle, shippingRates: loadedShippingRates, language, translations, rtl } = useLoaderData<typeof loader>();
    const { t } = useTranslation('formDesigner');
    const submit = useSubmit();
    const navigation = useNavigation();
    // Using standard fetch instead of App Bridge authenticated fetch

    const [isEditingPopupButton, setIsEditingPopupButton] = useState(false);
    const [isEditingLogistics, setIsEditingLogistics] = useState(false);
    const [formFields, setFormFields] = useState<FormField[]>(loadedFormFields);
    const [formStyle, setFormStyle] = useState<FormStyle>(loadedFormStyle);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const fetcher = useFetcher<RateImportFetcherData>();
    const [allWilayas, setAllWilayas] = useState<AlgeriaLocation[]>([]);
    const [isImporting, setIsImporting] = useState(false); // Added for loading state
    const [expandedWilayas, setExpandedWilayas] = useState<Record<string, boolean>>({});
    const lastFetcherData = useRef<RateImportFetcherData | null>(null);
    const isSaving = navigation.state === 'submitting';
    
    // ADD THIS REF TO TRACK THE SAVING STATE
    const wasSaving = useRef(false);
    
    // 1. ADD THIS NEW STATE VARIABLE FOR HYDRATION FIX
    const [isMounted, setIsMounted] = useState(false);

    // 2. ADD THIS USEEFFECT HOOK - It runs only once on the client side
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // Corrected the fetch path from "/app/api/..." to "/api/..."
        fetch('/api/algeria-locations')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setAllWilayas(data);
                }
            })
            .catch(err => console.error("Failed to fetch initial wilayas list:", err));
    }, []);

    useEffect(() => {
        const scriptId = 'app-bridge-ui-script';
        if (document.getElementById(scriptId)) {
            return;
        }
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = "https://cdn.shopify.com/shopifycloud/app-bridge-ui-experimental.js";
        script.async = true;
        document.head.appendChild(script);
    }, []);

    const [formTexts, setFormTexts] = useState({ requiredFieldError: 'This field is required.', invalidFieldError: 'Enter a valid value.', });
    const [previewData, setPreviewData] = useState({ 
    productName: getLocalizedText('Knitted Throw Pillows', 'french'),
    productPrice: '250 DA', 
    productQuantity: 1, 
    productImage: 'https://i.imgur.com/3426yL7.jpeg ', 
    subtotal: '250 DA', 
    shipping: 'Free', 
    total: '250 DA' 
});
    const [formValues, setFormValues] = useState<{ [key: string]: any }>({});
    const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string; heading?: string }>({ open: false, severity: 'success', msg: '' });
    const [expandedSections, setExpandedSections] = useState<ExpandedSections & { [key: string]: boolean }>({
        mode: true,
        fields: true,
        style: true,
        texts: true,
        'provider-Manual': true,
        'provider-Noest (NOEST EXPRESS)': true,
        'provider-EcoTrack (DHD)': true,
    });
    const [tabValue, setTabValue] = useState<'form' | 'shipping'>('form');
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>(loadedShippingRates);
    const [isAddingRate, setIsAddingRate] = useState(false);
    const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
    const [shippingSearchQuery, setShippingSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('price_asc');
    const [activeId, setActiveId] = useState<string | null>(null);
    const [openFieldSettings, setOpenFieldSettings] = useState<Record<string, boolean>>({});
    const [addFieldMenuAnchor, setAddFieldMenuAnchor] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [colorPickerAnchor, setColorPickerAnchor] = React.useState<null | HTMLElement>(null);
    const [activeColorKey, setActiveColorKey] = useState<string>('');
    const [activeColorSettingsObject, setActiveColorSettingsObject] = useState<any>(null);
    const [activeColorCallback, setActiveColorCallback] = useState<(color: string) => void>(() => () => { });
    const [isGradientEnabled, setIsGradientEnabled] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
    const logisticsField = formFields.find(f => f.type === 'logistics-delivery');
    const designerFields = formFields.filter(f => {
    // Include all fields except logistics-delivery (which is a hidden config field)
    return f.type !== 'logistics-delivery';
});

    const showSnack = useCallback((severity: 'success' | 'error' | 'info', heading: string, msg: string) => {
        setSnack({ open: true, severity, heading, msg });
    }, []);

   // In CODFormDesignerRoot component
  
 useEffect(() => {
    // Find the settings for the shipping rates field to get the "Free" text
    const shippingRatesSettings = formFields.find(f => f.type === 'shipping-rates')?.settings as ShippingRatesSettings;
    const freeText = shippingRatesSettings?.freeText || 'Free';
    const currency = formStyle.currencySymbol || 'DA'; // Get the selected currency symbol

    // Get the latest shipping price from the central form state
    const shippingPrice = formValues.shippingPrice || 0;
const formatCurrency = (amount: number, symbol: string) => {
    if (symbol === 'دج') {
        return `${symbol} ${amount.toFixed(0)}`; // Arabic: دج 250
    } else {
        return `${amount.toFixed(0)} ${symbol}`; // Latin: 250 DA
    }
};

const newShippingText = shippingPrice > 0 ? formatCurrency(shippingPrice, currency) : freeText;
const newTotalText = formatCurrency(250, currency);
    // Update the previewData state only if there's a change
    if (newShippingText !== previewData.shipping || newTotalText !== previewData.total) {
        setPreviewData(prev => ({
            ...prev,
            shipping: newShippingText,
            total: newTotalText,
        }));
    }
}, [formValues.shippingPrice, formFields, formStyle.currencySymbol, previewData.total, previewData.shipping]); // <-- Updated dependencies

    useEffect(() => {
        const initialData = {
            formFields: loadedFormFields,
            formStyle: loadedFormStyle,
            shippingRates: loadedShippingRates,
        };
        const currentData = {
            formFields,
            formStyle,
            shippingRates,
        };

        const hasChanges = JSON.stringify(initialData) !== JSON.stringify(currentData);
        
        console.log('🔄 [hasUnsavedChanges] - Checking for changes:', {
            hasChanges,
            formFieldsChanged: JSON.stringify(initialData.formFields) !== JSON.stringify(currentData.formFields),
            formStyleChanged: JSON.stringify(initialData.formStyle) !== JSON.stringify(currentData.formStyle),
            shippingRatesChanged: JSON.stringify(initialData.shippingRates) !== JSON.stringify(currentData.shippingRates),
        });

        setHasUnsavedChanges(hasChanges);
    }, [formFields, formStyle, shippingRates, loadedFormFields, loadedFormStyle, loadedShippingRates]);


const handleSave = useCallback(async () => {
  console.log('🔄 [handleSave] - Function called');
  console.log('🔄 [handleSave] - Current state:', {
    formFields: formFields.length,
    formStyle: Object.keys(formStyle).length,
    shippingRates: shippingRates.length,
    hasUnsavedChanges,
    isSaving
  });

  if (isSaving) {
    console.log('⚠️ [handleSave] - Already saving, ignoring call');
    return;
  }

  // Manually set saving state (since we're not using useNavigation)
  // We can use the wasSaving ref to track this.
  wasSaving.current = true; 
  // You might want to add a new state like setIsSaving(true) if wasSaving isn't enough

  try {
    const formFieldsJson = JSON.stringify(formFields);
    const formStyleJson = JSON.stringify(formStyle);
    const shippingRatesJson = JSON.stringify(shippingRates);

    console.log('🔄 [handleSave] - Data prepared:', {
      formFieldsSize: formFieldsJson.length,
      formStyleSize: formStyleJson.length,
      shippingRatesSize: shippingRatesJson.length
    });

    console.log('🔄 [handleSave] - Submitting data with authenticatedFetch...');

    // Use authenticatedFetch to make the POST request
    const response = await fetch("/app/form-designer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formFields: formFieldsJson,
        formStyle: formStyleJson,
        shippingRates: shippingRatesJson,
      }),
    });

    wasSaving.current = false;
    // You might want to add setIsSaving(false) here

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('✅ [handleSave] - Submit call completed, response OK.', result);
        showSnack('success', 'Saved', 'Your changes have been saved successfully.');
        setHasUnsavedChanges(false);
      } else {
        // Handle server-side errors (e.g., verification failed)
        console.error('❌ [handleSave] - Server returned an error:', result.error);
        showSnack('error', 'Save Failed', result.error || 'An unknown error occurred on the server.');
      }
    } else {
      // Handle network errors (e.g., 500, 404)
      console.error('❌ [handleSave] - Network error:', response.status, response.statusText);
      showSnack('error', 'Save Failed', `Network Error: ${response.statusText}`);
    }

  } catch (error) {
    wasSaving.current = false;
    // You might want to add setIsSaving(false) here
    console.error('❌ [handleSave] - Client-side save failed:', error);
    showSnack('error', 'Save Failed', 'An error occurred while sending your changes.');
  }
}, [formFields, formStyle, shippingRates, isSaving, hasUnsavedChanges, showSnack]);

    const handleDiscard = useCallback(() => {
        setFormFields(loadedFormFields);
        setFormStyle(loadedFormStyle);
        setShippingRates(loadedShippingRates);
        showSnack('info', 'Changes Discarded', 'Your changes have been reverted.');
    }, [loadedFormFields, loadedFormStyle, loadedShippingRates, showSnack]);




    // ADD THIS NEW useEffect TO DETECT WHEN A SAVE COMPLETES
    useEffect(() => {
        // If the component was just saving, but now it's idle, the submission is complete.
        if (wasSaving.current && navigation.state === 'idle') {
            showSnack('success', 'Saved', 'Your changes have been saved successfully.');
            setHasUnsavedChanges(false);
        }
        // Update the ref to the current saving state for the next render.
        wasSaving.current = isSaving;
    }, [isSaving, navigation.state, showSnack]);



    const handleFieldSettingsChange = useCallback((fieldId: string, newSettings: Partial<AllFieldSettings>) => {
        setFormFields(prevFields =>
            prevFields.map(field => {
                if (field.id === fieldId) {
                    const newField = { ...field, settings: { ...field.settings, ...newSettings } };
                    if (newSettings.hasOwnProperty('required')) { newField.required = (newSettings as Partial<BaseFieldSettings>).required; }
                    if (newSettings.hasOwnProperty('label')) { newField.label = (newSettings as Partial<BaseFieldSettings>).label as string; }
                    return newField;
                }
                return field;
            })
        );
    }, []);

    useEffect(() => {
    // Set loading state based on fetcher activity
    if (fetcher.state === 'loading' || fetcher.state === 'submitting') {
      setIsImporting(true);
    } else {
      setIsImporting(false);

      // Process data only when fetcher is idle and the data is NEW.
      // This prevents re-running the logic on the same data if other dependencies change.
      if (fetcher.state === 'idle' && fetcher.data && fetcher.data !== lastFetcherData.current) {
        
        // Mark the data as "seen" by updating the ref's current value.
        lastFetcherData.current = fetcher.data;

        if (fetcher.data.error) {
          showSnack('error', 'Import Failed', fetcher.data.error);
        } else if (fetcher.data.success && fetcher.data.rates) {
          if (logisticsField) {
            const currentSettings = logisticsField.settings as LogisticsDeliverySettings;

            // Map the fetched rates to the required DeliveryRate format
            const newManualRates: DeliveryRate[] = fetcher.data.rates.map((rate: any) => ({
              wilayaId: parseInt(rate.wilaya_id, 10),
              wilayaName: rate.wilaya_name_fr || `Wilaya ${rate.wilaya_id}`,
              wilayaNameArabic: rate.wilaya_name_ar || `ولاية ${rate.wilaya_id}`,
              homeDeliveryPrice: parseFloat(rate.tarif) || 0,
              stopDeskPrice: parseFloat(rate.tarif_stopdesk) || 0,
            }));

            const existingRates = currentSettings.manualRates || [];

            // Filter out old rates from the current provider to avoid duplicates
            const filteredExistingRates = existingRates.filter(rate => {
              const rateProvider = rate.apiProvider || 'manual';
              return rateProvider !== currentSettings.apiProvider;
            });

            // Add the current provider's identifier to the new rates
            const ratesWithProvider = newManualRates.map(rate => ({
              ...rate,
              apiProvider: currentSettings.apiProvider,
            }));

            // Combine the existing rates (from other providers) with the newly imported rates
            const combinedRates = [...filteredExistingRates, ...ratesWithProvider];

            // Update the field settings with the new combined rates
            handleFieldSettingsChange(logisticsField.id, { manualRates: combinedRates });

            // Show a success message
            showSnack('success', 'Import Complete', `Successfully imported ${newManualRates.length} rates from ${currentSettings.apiProvider}.`);
          }
        }
      }
    }
    // The dependency array is correct. The effect should re-evaluate when these change.
    // The logic inside now prevents it from acting on stale data.
  }, [fetcher.state, fetcher.data, logisticsField, handleFieldSettingsChange, showSnack]);



// Located inside the CODFormDesignerRoot component

const handleImportRates = useCallback(() => {
    if (!logisticsField) return;

    const settings = logisticsField.settings as LogisticsDeliverySettings;

    // --- Validation Section (No change) ---
    if (settings.apiProvider === 'manual') {
        showSnack('info', 'No Import Needed', 'Manual rates are edited directly.');
        return;
    }
    if (!settings.apiToken) {
        showSnack('error', 'Configuration Error', `API Token for ${settings.apiProvider} is missing.`);
        return;
    }
    if (settings.apiProvider === 'noest' && !settings.userGuid) {
        showSnack('error', 'Configuration Error', 'User GUID is required for Noest.');
        return;
    }
    // --- End of Validation ---

    // ✅ ADD THIS LINE to close the editor UI before starting the import
    setIsEditingLogistics(false);

    // --- Fetcher Logic (No change) ---
    setIsImporting(true);
    const params = new URLSearchParams();
    params.append("apiProvider", settings.apiProvider);
    if (settings.apiUrl) params.append("apiUrl", settings.apiUrl);
    if (settings.apiToken) params.append("apiToken", settings.apiToken);
    if (settings.userGuid) params.append("userGuid", settings.userGuid);

    fetcher.load(`/api/import-rates?${params.toString()}`);

    const providerDisplayName = settings.apiProvider.charAt(0).toUpperCase() + settings.apiProvider.slice(1);
    showSnack('info', 'Importing...', `Fetching rates from ${providerDisplayName}...`);
}, [logisticsField, fetcher, showSnack]);


    const handleValidation = useCallback((field: FormField, value: any) => {
        const s = field.settings as any;
        let newError: string | undefined = undefined;
        const stringValue = String(value || '');

        if (s.required && stringValue.trim() === '') {
            newError = formTexts.requiredFieldError || 'This field is required.';
        }
        else if (s.minLength && stringValue.length > 0 && stringValue.length < s.minLength) {
            newError = `Must be at least ${s.minLength} characters.`;
        }
        else if (field.type === 'custom-text-input' && s.allowOnlyNumbers && stringValue && !/^\d*$/.test(stringValue)) {
            newError = s.invalidValueError || 'Please enter only numbers.';
        }
        else if (field.type === 'email' && stringValue && !s.disableValidation && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
            newError = s.invalidEmailErrorText || 'Please enter a valid email.';
        }
        setFormErrors(prevErrors => ({
            ...prevErrors,
            [field.id]: newError,
        }));
    }, [formTexts.requiredFieldError]);

    const handleAddField = useCallback((type: string, defaultSettings: AllFieldSettings, label: string) => {
        const newId = `${type}-${Date.now()}`;
        const newField: FormField = { id: newId, type, label, enabled: true, editable: true, settings: { label, ...defaultSettings } };
        setFormFields(prev => [...prev, newField]);
        setOpenFieldSettings(prev => ({ ...prev, [newId]: true }));
        setAddFieldMenuAnchor(false);
    }, []);

    const defaultButtonSettings: ButtonSettings = { buttonText: 'Click Me', buttonSubtitle: '', animation: 'none', icon: 'none', backgroundColor: '#5c6ac4', textColor: '#FFFFFF', fontSize: 16, borderRadius: 8, borderWidth: 0, borderColor: '#5c6ac4', shadow: 2, layout: 'full-width' };

const addFieldOptions = [
    // Moved fields from initial form
    { type: 'terms', label: 'Accept our terms and conditions', settings: { label: 'Accept our terms and conditions', required: true, termsUrl: '#' } as TermsSettings },
    { type: 'custom-link-button', label: 'Learn more button', settings: { ...defaultButtonSettings, buttonText: 'Learn More', buttonUrl: '#', backgroundColor: '#E4E5E7', textColor: '#202223', layout: 'half-right' } as CustomLinkButtonSettings },
    { type: 'custom-whatsapp-button', label: 'WhatsApp button', settings: { ...defaultButtonSettings, buttonText: 'Order on WhatsApp', whatsappPhoneNumber: '123456789', createOrderOnClick: true, prefilledMessage: 'Hello there! I would like to buy this product: {page_url}\nCan you help me?', backgroundColor: '#25D366', textColor: '#FFFFFF', layout: 'half-left' } as WhatsappButtonSettings },
    { type: 'subscribe', label: 'Subscribe to stay updated with new products and offers!', settings: { label: 'Subscribe to stay updated with new products and offers!', preselect: false } as NewsletterSettings },
    { type: 'order-note', label: 'Order note', settings: { label: 'Order note (optional)', placeholder: 'Add a note for your order...', required: false, showIcon: true } as CommonTextFieldSettings },
    { type: 'email', label: 'Email', settings: { label: 'Email (optional)', placeholder: 'example@email.com', required: false, showIcon: true, invalidEmailErrorText: 'Please enter a valid email.' } as EmailFieldSettings },
    { type: 'zip-code', label: 'Zip code', settings: { label: 'Zip code', placeholder: 'Your zip code', required: true, showIcon: true } as CommonTextFieldSettings },
    { type: 'province', label: 'Province', settings: { label: 'Province', placeholder: 'Your province', required: true, showIcon: true } as CommonTextFieldSettings },
    { type: 'city', label: 'City', settings: { label: 'City', placeholder: 'Your city', required: true, disableDropdown: false } as CityFieldSettings },
    { type: 'address2', label: 'Address 2', settings: { label: 'Address 2 (optional)', placeholder: 'Apartment, suite, etc.', required: false, showIcon: true } as CommonTextFieldSettings },
    { type: 'first-name', label: 'First name', settings: { label: 'First name', placeholder: 'Enter your first name', required: true, showIcon: true } as CommonTextFieldSettings },
    { type: 'last-name', label: 'Last name', settings: { label: 'Last name', placeholder: 'Enter your last name', required: true, showIcon: true } as CommonTextFieldSettings },
    { type: 'discount-codes', label: 'Discount', settings: { limitToOne: true, discountsLineText: 'Discount', discountCodeFieldLabel: 'Discount code', applyButtonText: 'Apply', applyButtonBackgroundColor: '#5c6ac4', invalidDiscountCodeErrorText: 'Invalid discount code', oneDiscountAllowedErrorText: 'Only one discount code is allowed.' } as DiscountCodesSettings },
    
    // Existing custom fields
    { type: 'custom-title', label: 'Custom Text', settings: { text: 'Your text here', alignment: 'center', fontSize: 16, fontWeight: 'normal', textColor: '#000000' } as CustomTitleSettings },
    { type: 'custom-image', label: 'Image or GIF', settings: { imageUrl: 'https://via.placeholder.com/400x200', imageSize: 100 } as CustomImageSettings },
    { type: 'shopify-checkout-button', label: 'Shopify Checkout Button', settings: { ...defaultButtonSettings, buttonText: 'Checkout', discountType: 'none' } as ShopifyCheckoutButtonSettings },
    { type: 'quantity-selector', label: 'Quantity Selector', settings: { label: 'Quantity', alignment: 'left' } as QuantitySelectorSettings },
    { type: 'custom-text-input', label: 'Text Input', settings: { placeholder: 'Enter value', required: false, connectTo: 'nothing' } as CustomTextInputSettings },
    { type: 'custom-dropdown', label: 'Dropdown List', settings: { placeholder: 'Select an option', values: 'Option 1,Option 2', connectTo: 'nothing' } as CustomDropdownSettings },
    { type: 'custom-single-choice', label: 'Single-Choice Input', settings: { values: 'Choice 1,Choice 2', connectTo: 'nothing', preselectFirst: false } as CustomSingleChoiceSettings },
    { type: 'custom-checkbox', label: 'Checkbox', settings: { label: 'I agree', checkboxName: 'custom_checkbox' } as CustomCheckboxSettings },
    { type: 'custom-date-selector', label: 'Date Selector', settings: { placeholder: 'YYYY-MM-DD', showIcon: true, excludeSaturdays: false, excludeSundays: false, allowOnlyNextDays: false } as CustomDateSelectorSettings },
    
    { type: 'custom-password-field', label: 'Password Field', settings: { placeholder: 'Enter password', required: true } as CustomPasswordFieldSettings },
    {
        type: 'custom-icon-feature',
        label: 'Trust Badges / Icons',
        settings: {
            title: 'Our Guarantees',
            titlePosition: 'top',
            features: [
                { enabled: true, imageUrl: 'https://cdn-icons-png.flaticon.com/512/11628/11628524.png', caption: 'Cash on Delivery' },
                { enabled: true, imageUrl: 'https://cdn-icons-png.flaticon.com/512/1670/1670965.png', caption: 'Fast Delivery' },
                { enabled: true, imageUrl: 'https://cdn-icons-png.flaticon.com/512/9368/9368849.png', caption: '24/7 Support' },
            ],
            layout: 'auto',
        } as CustomIconFeatureSettings,
    },
];

    const toggleFieldEnabled = useCallback((fieldId: string) => {
        setFormFields(prev => prev.map(field => field.id === fieldId ? { ...field, enabled: !field.enabled } : field));
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted in preview');
        showSnack('info', 'Form Submit', 'This is a preview, form was not actually submitted.');
    }, [showSnack]);

    const ColorPickerTrigger: React.FC<{
        settingKey: string;
        label: string;
        enableGradient?: boolean;
        getSettings: () => any;
        onUpdate?: (color: string) => void;
    }> = useCallback(({ settingKey, label, enableGradient = false, getSettings, onUpdate }) => {
        const color = safeColor(getSettings()[settingKey]);
        const open = (e: React.MouseEvent<HTMLElement>) => {
            setActiveColorKey(settingKey);
            setActiveColorSettingsObject(getSettings());
            setActiveColorCallback(() => onUpdate || ((c: string) => {
                if (getSettings() === formStyle) {
                    setFormStyle(p => ({ ...p, [settingKey]: c }));
                } else {
                    setFormFields(prevFields =>
                        prevFields.map(field => {
                            if (field.settings === getSettings()) {
                                return { ...field, settings: { ...field.settings, [settingKey]: c } };
                            }
                            return field;
                        })
                    );
                }
            }));
            setIsGradientEnabled(enableGradient);
            setColorPickerAnchor(e.currentTarget);
        };
        return (
            <div onClick={open} style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-200)', padding: 'var(--p-space-200)', border: '1px solid var(--p-color-border)', borderRadius: 'var(--p-border-radius-100)', cursor: 'pointer' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', flexGrow: 1 }}>{label}: {color}</span>
                <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: color, border: '1px solid #ccc' }} />
            </div>
        );
    }, [formStyle]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8, }, }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        document.body.style.overflow = 'hidden';
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFormFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
        setActiveId(null);
        document.body.style.overflow = '';
    }, []);

    const activeField = activeId ? formFields.find(f => f.id === activeId) : null;

    const formatConditions = useCallback((rate: ShippingRate): string => {
        if (rate.conditions.length === 0 && !rate.provinces) return rate.description || 'No specific conditions.';
        const parts: string[] = [];
        rate.conditions.forEach(cond => {
            switch (cond.type) {
                case 'price_gte': parts.push(`Total ≥ ${cond.value} DZD`); break;
                case 'price_lt': parts.push(`Total < ${cond.value} DZD`); break;
                case 'weight_gte': parts.push(`Weight ≥ ${cond.value} kg`); break;
                case 'weight_lt': parts.push(`Weight < ${cond.value} kg`); break;
                case 'quantity_gte': parts.push(`Quantity ≥ ${cond.value}`); break;
                case 'quantity_lt': parts.push(`Quantity < ${cond.value}`); break;
                case 'includes_product': parts.push(`Has: ${cond.value}`); break;
                case 'excludes_product': parts.push(`Lacks: ${cond.value}`); break;
                default: break;
            }
        });
        if (rate.provinces) parts.push(`Provinces: ${rate.provinces}`);
        return parts.join('; ');
    }, []);

    const logisticsSettings = logisticsField?.settings as LogisticsDeliverySettings | undefined;

    // Replacement for the sortedRates useMemo hook
const sortedRates = useMemo(() => {
    let rates: ExtendedShippingRate[] = [];
    const providerDisplayNames: Record<string, string> = {
        noest: 'Noest',
        ecotrack: 'EcoTrack (Generic)',
        dhd: 'DHD',
        anderson: 'Anderson Delivery',
        areex: 'Areex',
        baconsult: 'BA Consult',
        conexlog: 'Conexlog',
        coyoteexpress: 'Coyote Express',
        distazero: 'Distazero',
        '48hr': '48Hr Livraison',
        fretdirect: 'FRET.Direct',
        golivri: 'GOLIVRI',
        msmgo: 'MSM Go',
        packers: 'Packers',
        prest: 'Prest',
        rex: 'Rex Livraison',
        rocket: 'Rocket Delivery',
        salva: 'Salva Delivery',
        speed: 'Speed Delivery',
        tsl: 'TSL Express',
        maystro: 'Maystro Delivery',
        zrexpress: 'ZR Express',
        procolis: 'COLIRELI/Procolis',
    };

    // Handle logistics rates (imported from APIs)
    if (logisticsSettings && logisticsSettings.manualRates && logisticsSettings.manualRates.length > 0) {
        rates = logisticsSettings.manualRates.map(rate => {
            const rateProvider = rate.apiProvider || 'manual'; // Default to manual if not set
            const wilayaName = logisticsSettings.algeriaWilayaMode === 'arabic'
                ? (rate.wilayaNameArabic || `ولاية ${rate.wilayaId}`)
                : (rate.wilayaName || `Wilaya ${rate.wilayaId}`);

            return {
                id: `imported-${rate.wilayaId}-${rateProvider}`,
                name: wilayaName,
                price: rate.homeDeliveryPrice,
                description: `Home: ${rate.homeDeliveryPrice} DZD, Stop Desk: ${rate.stopDeskPrice} DZD`,
                conditions: [],
                groupName: providerDisplayNames[rateProvider] || 'Imported', // Use groupName for display
                wilayaId: rate.wilayaId,
                apiProvider: rateProvider,
                wilayaName: rate.wilayaName,
                wilayaNameArabic: rate.wilayaNameArabic,
            };
        });
    }

    // Add manually configured shipping rates
    const manualRates = shippingRates.map(rate => ({
        ...rate,
        groupName: 'Manual', // Assign to the "Manual" group
    }));

    rates = [...rates, ...manualRates];

    // Apply search filter
    const filteredRates = rates.filter(rate =>
        rate.name.toLowerCase().includes(shippingSearchQuery.toLowerCase())
    );

    // Apply sorting
    return filteredRates.sort((a, b) => {
        // Group by provider first
        if (a.groupName !== b.groupName) {
            return a.groupName!.localeCompare(b.groupName!);
        }

        // Then by wilaya ID if both have it
        if (a.wilayaId && b.wilayaId) {
            return a.wilayaId - b.wilayaId;
        }
        
        // Finally by the selected sort criteria
        switch (sortBy) {
            case 'price_desc': return b.price - a.price;
            case 'name_asc': return a.name.localeCompare(b.name);
            case 'name_desc': return b.name.localeCompare(a.name);
            case 'price_asc': 
            default: return a.price - b.price;
        }
    });
}, [logisticsSettings, shippingRates, sortBy, shippingSearchQuery]);

const groupedRates = useMemo(() => {
    return sortedRates.reduce((acc, rate) => {
        // Use the new groupName property for grouping
        const group = rate.groupName || 'Manual';
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(rate);
        return acc;
    }, {} as Record<string, ExtendedShippingRate[]>);
}, [sortedRates]);

    const snackbarMarkup = (
        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Alert onClose={() => setSnack(p => ({ ...p, open: false }))} severity={snack.severity} sx={{ width: '100%' }} variant="filled">
                {snack.heading && <AlertTitle>{snack.heading}</AlertTitle>}
                {snack.msg}
            </Alert>
        </Snackbar>
    );


    const renderSection = (title: string, key: keyof ExpandedSections, content: React.ReactNode, icon: IconSource, action?: React.ReactNode) => (
        <Card>
            <div style={{ cursor: 'pointer' }} onClick={() => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))}>
                <Box padding="100" paddingBlock={expandedSections[key] ? "200" : "100"} borderBlockEndWidth={expandedSections[key] ? '025' : undefined} borderColor='border'>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ marginRight: '2px' }}>
                                <Icon source={icon} tone="base" />
                            </div>
                            <Text variant="headingMd" as="h3">{title}</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {action && <div style={{ marginRight: '8px' }}>{action}</div>}
                            <Icon source={expandedSections[key] ? ChevronUpIcon : ChevronDownIcon} />
                        </div>
                    </div>
                </Box>
            </div>
            <Collapsible open={!!expandedSections[key]} id={`${key}-collapsible`}
                transition={{ duration: '300ms', timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
                <Box paddingInline="200" paddingBlockStart="500" paddingBlockEnd="200">{content}</Box>
            </Collapsible>
        </Card>
    );



    return (
        <Frame>
            {/* 3. UPDATED SAVE BAR WITH PROPER ATTRIBUTES */}

            <Page
                title={t('title')}
                subtitle={t('subtitle')}
                backAction={{
                    content: t('back'),
                    onAction: () => {
                        if (window.history.length > 1) {
                            window.history.back();
                        } else {
                            window.location.href = "/app";
                        }
                    }
                }}
                primaryAction={{
                    content: t('save'),
                    onAction: () => {
                        console.log('🔄 [Save Button] - Clicked with state:', {
                            hasUnsavedChanges,
                            isSaving,
                            formFieldsCount: formFields.length,
                            formStyleKeys: Object.keys(formStyle).length,
                            shippingRatesCount: shippingRates.length
                        });
                        handleSave();
                    },
                    loading: isSaving,
                    disabled: !hasUnsavedChanges || isSaving,
                }}
                secondaryActions={[
                    {
                        content: 'Discard',
                        onAction: handleDiscard,
                        disabled: !hasUnsavedChanges || isSaving,
                    },
                ]}
            >
                <style>{`
    olor 0.2s ease;

}


.field-item-header-revised:hover {

    background-color: var(--p-color-bg-surface-active);

}


.field-item-header-p {

    margin: 0;

    font-size: var(--p-font-size-100);

    font-weight: var(--p-font-weight-semibold);

    color: var(--p-color-text);

    flex-grow: 1;

    margin-inline: var(--p-space-200);

    white-space: nowrap;

    overflow: hidden;

    text-overflow: ellipsis;

}


@media (max-width: 600px) {

    .field-item-header-revised {

        flex-direction: column;

        align-items: flex-start;

        gap: var(--p-space-200);

    }


    .field-item-header-p {

        margin-inline: 0;

        margin-bottom: var(--p-space-100);

    }

}

`}</style> 
                <div style={{ padding: 'var(--p-space-400)' }}>
                    <LegacyStack distribution="center" alignment="center" spacing="tight">
                        <div style={{ maxWidth: '500px', width: '100%' }}>
                            <Card>
                                <LegacyStack distribution="fillEvenly">
                                    <Button fullWidth icon={CodeIcon} pressed={tabValue === 'form'} onClick={() => setTabValue('form')}>Form Designer</Button>
                                    <Button fullWidth icon={ShipmentIcon} pressed={tabValue === 'shipping'} onClick={() => setTabValue('shipping')}>Shipping Rates</Button>
                                </LegacyStack>
                            </Card>
                        </div>
                    </LegacyStack>
                    <Box paddingBlockStart="400" />
                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, md: 6, lg: tabValue === 'shipping' ? 12 : 6, xl: 6 }}>
                            {tabValue === 'form' && (
                                <BlockStack gap="200">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <Text variant="headingMd" as="h3">
                                            1. Select your form mode
                                        </Text>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <s-icon type="eye" size="small" />
                                            <Text variant="headingMd" as="h3">
                                                Live Preview
                                            </Text>
                                        </div>
                                    </div>
                                    {renderSection('1. Select your form mode', 'mode',
    <BlockStack gap="400">
        <MuiFormControl component="fieldset" fullWidth>
            <FormLabel
                component="legend"
                sx={{
                    mb: 2,
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: 'text.primary',
                    textAlign: 'center'
                }}
            >
                Choose Your Form Mode
            </FormLabel>

            <MuiStack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                justifyContent="center"
            >
                {[
                    {
                        value: 'popup',
                        icon: 'https://cdn-icons-png.flaticon.com/512/3814/3814336.png',
                        title: 'Popup',
                        caption: 'Opens in an overlay'
                    },
                    {
                        value: 'embedded',
                        icon: 'https://cdn-icons-png.flaticon.com/512/17839/17839541.png',
                        title: 'Embedded',
                        caption: 'Shows inside the page'
                    }
                ].map((option) => (
                    <MuiBox
                        key={option.value}
                        onClick={() => setFormStyle(p => ({ ...p, mode: option.value as "popup" | "embedded" }))}
                        sx={{
                            flex: 1,
                            minWidth: 140,
                            maxWidth: 180,
                            position: 'relative',
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: formStyle.mode === option.value ? 'primary.main' : 'grey.300',
                            borderRadius: 3,
                            p: 1.5,
                            textAlign: 'center',
                            backgroundColor: formStyle.mode === option.value ? 'primary.50' : 'background.paper',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                borderColor: 'primary.main',
                                backgroundColor: 'primary.50',
                                transform: 'translateY(-2px)',
                                boxShadow: 2
                            }
                        }}
                    >
                        <FormControlLabel
                            value={option.value}
                            control={
                                <MuiRadio
                                    checked={formStyle.mode === option.value}
                                    onChange={(e) => setFormStyle(p => ({ ...p, mode: e.target.value as "popup" | "embedded" }))}
                                    sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        color: 'primary.main'
                                    }}
                                />
                            }
                            label=""
                            sx={{ m: 0, width: '100%' }}
                        />
                        <MuiBox sx={{ mb: 1 }}>
                            <img
                                src={option.icon}
                                alt={option.title}
                                style={{
                                    width: 36,
                                    height: 36,
                                    filter: formStyle.mode === option.value
                                        ? 'drop-shadow(0 2px 4px rgba(25, 118, 210, 0.3))'
                                        : 'grayscale(30%)',
                                    transition: 'all 0.3s ease',
                                    transform: formStyle.mode === option.value ? 'scale(1.1)' : 'scale(1)'
                                }}
                            />
                        </MuiBox>
                        <Typography
                            variant="body1"
                            sx={{
                                fontWeight: 600,
                                color: formStyle.mode === option.value ? 'primary.main' : 'text.primary',
                                mb: 0.5,
                                fontSize: '0.9rem'
                            }}
                        >
                            {option.title}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: formStyle.mode === option.value ? 'primary.dark' : 'text.secondary',
                                lineHeight: 1.3
                            }}
                        >
                            {option.caption}
                        </Typography>
                    </MuiBox>
                ))}
            </MuiStack>
        </MuiFormControl>

        {/* ADD THIS NEW SECTION FOR POPUP BUTTON SETTINGS */}
        {formStyle.mode === 'popup' && (
            <Card>
    <Box padding="400">
        <LegacyStack alignment="center" distribution="equalSpacing">
            <LegacyStack alignment="center" spacing="tight">
                <img 
                    src="https://cdn-icons-png.flaticon.com/512/11618/11618757.png" 
                    alt="Settings Logo" 
                    style={{ width: '24px', height: '24px' }}
                />
                <Text variant="headingMd" as="h4">Popup Button Settings</Text>
            </LegacyStack>
            <Button 
                size="slim" 
                onClick={() => setIsEditingPopupButton(!isEditingPopupButton)}
                icon={isEditingPopupButton ? ChevronUpIcon : EditIcon}
            >
                {isEditingPopupButton ? 'Done' : 'Edit Button'}
            </Button>
        </LegacyStack>
        
        <Collapsible 
            open={isEditingPopupButton} 
            id="popup-button-settings"
            transition={{ duration: '300ms', timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
            <Box paddingBlockStart="400">
                <BlockStack gap="400">
                    <TextField
                        label={t('buttons.buttonText')}
                        value={formStyle.popupButtonSettings?.buttonText || 'Open Form'}
                        onChange={(value) => setFormStyle(p => ({
                            ...p,
                            popupButtonSettings: { ...p.popupButtonSettings!, buttonText: value }
                        }))}
                        autoComplete="off"
                    />

                    <Select
                        label={t('buttons.buttonAnimation')}
                        options={[
                            { label: 'None', value: 'none' },
                            { label: 'Shaker', value: 'shaker' },
                            { label: 'Bounce', value: 'bounce' },
                            { label: 'Pulse', value: 'pulse' },
                            { label: 'Wobble', value: 'wobble' },
                            { label: 'Glitch Text', value: 'glitch-text' },
                            { label: 'Gradient Wave', value: 'gradient-wave' },
                            { label: 'Money Rain', value: 'money-rain' },
                            { label: 'Heartbeat', value: 'heartbeat' },
                            { label: 'Flash Glow', value: 'flash-glow' },
                            { label: 'Coin Flip', value: 'coin-flip' },
                            { label: 'Cash Magnet', value: 'cash-magnet' },
                            { label: 'Order Processing', value: 'order-processing' },
                            { label: 'Border Reveal', value: 'border-reveal' },
                            { label: '3D Plane Rotate', value: 'rotate-3d-plane' },
                            { label: 'Typing Effect', value: 'typing-effect' }
                        ]}
                        value={formStyle.popupButtonSettings?.animation || 'none'}
                        onChange={(value) => setFormStyle(p => ({
                            ...p,
                            popupButtonSettings: { ...p.popupButtonSettings!, animation: value }
                        }))}
                    />

                    <Select
                        label="Button Placement"
                        options={[
                            { label: 'Center', value: 'center' },
                            { label: 'Left', value: 'left' },
                            { label: 'Right', value: 'right' }
                        ]}
                        value={formStyle.popupButtonSettings?.placement || 'center'}
                        onChange={(value) => setFormStyle(p => ({
                            ...p,
                            popupButtonSettings: { ...p.popupButtonSettings!, placement: value as 'center' | 'left' | 'right' }
                        }))}
                    />

                    <Checkbox
                        label="Follow user (sticky footer)"
                        checked={formStyle.popupButtonSettings?.followUser || false}
                        onChange={(checked) => setFormStyle(p => ({
                            ...p,
                            popupButtonSettings: { ...p.popupButtonSettings!, followUser: checked }
                        }))}
                        helpText="Button will stick to the bottom of the page and follow as user scrolls"
                    />

                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <EditorColorField
                                label="Background Color"
                                settingKey="backgroundColor"
                                color={formStyle.popupButtonSettings?.backgroundColor || '#6366f1'}
                                onUpdate={(c) => setFormStyle(p => ({
                                    ...p,
                                    popupButtonSettings: { ...p.popupButtonSettings!, backgroundColor: c }
                                }))}
                                fieldSettings={formStyle.popupButtonSettings || {}}
                                ColorPickerTrigger={ColorPickerTrigger}
                                enableGradient
                            />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <EditorColorField
                                label="Text Color"
                                settingKey="textColor"
                                color={formStyle.popupButtonSettings?.textColor || '#ffffff'}
                                onUpdate={(c) => setFormStyle(p => ({
                                    ...p,
                                    popupButtonSettings: { ...p.popupButtonSettings!, textColor: c }
                                }))}
                                fieldSettings={formStyle.popupButtonSettings || {}}
                                ColorPickerTrigger={ColorPickerTrigger}
                            />
                        </Grid.Cell>
                    </Grid>

                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <RangeSlider
                                label={`Font Size: ${formStyle.popupButtonSettings?.fontSize || 16}px`}
                                value={formStyle.popupButtonSettings?.fontSize || 16}
                                onChange={(value) => setFormStyle(p => ({
                                    ...p,
                                    popupButtonSettings: { ...p.popupButtonSettings!, fontSize: typeof value === 'number' ? value : value[0] }
                                }))}
                                min={10}
                                max={24}
                                output
                            />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <RangeSlider
                                label={`Border Radius: ${formStyle.popupButtonSettings?.borderRadius || 12}px`}
                                value={formStyle.popupButtonSettings?.borderRadius || 12}
                                onChange={(value) => setFormStyle(p => ({
                                    ...p,
                                    popupButtonSettings: { ...p.popupButtonSettings!, borderRadius: typeof value === 'number' ? value : value[0] }
                                }))}
                                min={0}
                                max={50}
                                output
                            />
                        </Grid.Cell>
                    </Grid>

                    <RangeSlider
                        label={`Shadow: ${formStyle.popupButtonSettings?.shadow || 2}`}
                        value={formStyle.popupButtonSettings?.shadow || 2}
                        onChange={(value) => setFormStyle(p => ({
                            ...p,
                            popupButtonSettings: { ...p.popupButtonSettings!, shadow: typeof value === 'number' ? value : value[0] }
                        }))}
                        min={0}
                        max={24}
                        output
                    />
                </BlockStack>
            </Box>
        </Collapsible>
    </Box>
</Card>
        )}

        <Select
            label="Field layout"
            options={[
                { label: 'Single column', value: 'single' },
                { label: 'Two columns', value: 'double' }
            ]}
            value={formStyle.layout || 'single'}
            onChange={(v: 'single' | 'double') => setFormStyle(p => ({ ...p, layout: v }))}
        />
    </BlockStack>,
    QuestionCircleIcon
)}
                                    {renderSection('2. Customize your form', 'fields',
                                        <>
                                            {/* 4. WRAP YOUR DNDCONTEXT IN THE isMounted CHECK */}
                                            {isMounted && (
                                                <DndContext
                                                    sensors={sensors}
                                                    collisionDetection={closestCenter}
                                                    onDragStart={handleDragStart}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <SortableContext
                                                        items={designerFields.map((f) => f.id)}
                                                        strategy={rectSortingStrategy}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "grid",
                                                                gridTemplateColumns:
                                                                    formStyle.layout === "double" ? "1fr 1fr" : "1fr",
                                                                gap: "var(--p-space-200)",
                                                                listStyle: "none",
                                                                padding: 0,
                                                                margin: 0,
                                                            }}
                                                        >
                                                            {designerFields.map((field, index) => (
                                                                <SortableFieldWrapper
                                                                    key={field.id}
                                                                    id={field.id}
                                                                    field={field}
                                                                    formStyle={formStyle}
                                                                >
                                                                    {(listeners) => (
                                                                        <div
                                                                            className={`field-item transition-all duration-300 ${activeId === field.id ? "drag-preview" : ""
                                                                                } hover:shadow-lg hover:-translate-y-0.5`}
                                                                            style={{
                                                                                cursor: "grab",
                                                                                opacity: field.enabled ? 1 : 0.5,
                                                                                transition: "opacity 300ms ease",
                                                                            }}
                                                                        >
                                                                            <Box
                                                                                borderWidth="025"
                                                                                borderColor="border"
                                                                                borderRadius="200"
                                                                                background="bg-surface"
                                                                                shadow="100"
                                                                            >
                                                                                <div
                                                                                    className="field-item-header-revised"
                                                                                    style={{ cursor: "grab" }}
                                                                                    {...listeners}
                                                                                >
                                                                                    <LegacyStack spacing="tight" alignment="center">
                                                                                        <Icon source={DragHandleIcon} tone="subdued" />
                                                                                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                                                            {field.label}
                                                                                        </Text>
                                                                                    </LegacyStack>

                                                                                    <div onPointerDown={(e) => e.stopPropagation()}>
                                                                                        <ButtonGroup>
                                                                                            <Button
                                                                                                size="slim"
                                                                                                variant="plain"
                                                                                                icon={field.enabled ? ViewIcon : HideIcon}
                                                                                                onClick={() => toggleFieldEnabled(field.id)}
                                                                                                accessibilityLabel={
                                                                                                    field.enabled ? "Hide field" : "Show field"
                                                                                                }
                                                                                            />
                                                                                            <Button
                                                                                                size="slim"
                                                                                                variant="plain"
                                                                                                icon={
                                                                                                    openFieldSettings[field.id]
                                                                                                        ? ChevronUpIcon
                                                                                                        : EditIcon
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    setOpenFieldSettings((p) => ({
                                                                                                        ...p,
                                                                                                        [field.id]: !p[field.id],
                                                                                                    }))
                                                                                                }
                                                                                                accessibilityLabel="Edit field settings"
                                                                                            />
                                                                                            {field.editable && (
                                                                                                <Button
                                                                                                    size="slim"
                                                                                                    variant="plain"
                                                                                                    tone="critical"
                                                                                                    icon={DeleteIcon}
                                                                                                    onClick={() =>
                                                                                                        setFormFields((prev) =>
                                                                                                            prev.filter((f) => f.id !== field.id)
                                                                                                        )
                                                                                                    }
                                                                                                    accessibilityLabel="Delete field"
                                                                                                />
                                                                                            )}
                                                                                        </ButtonGroup>
                                                                                    </div>
                                                                                </div>
                                                                                <Collapsible
                                                                                    open={openFieldSettings[field.id]}
                                                                                    id={`settings-${field.id}`}
                                                                                    transition={{
                                                                                        duration: "300ms",
                                                                                        timingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                                                                                    }}
                                                                                >
                                                                                    <FieldSettingsEditor
                                                                                        field={field}
                                                                                        onSettingsChange={handleFieldSettingsChange}
                                                                                        ColorPickerTrigger={ColorPickerTrigger}
                                                                                        allFormFields={formFields}
                                                                                        setFormValues={setFormValues}
                                                                                        allWilayas={allWilayas}
                                                                                        shippingRates={shippingRates} isEditingPopupButton={false}                                                                                    />
                                                                                </Collapsible>
                                                                            </Box>
                                                                        </div>
                                                                    )}
                                                                </SortableFieldWrapper>
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                    <DragOverlay>
                                                        {activeField && (
                                                            <div style={{ transform: "scale(1.02)", cursor: "grabbing" }}>
                                                                <Box
                                                                    borderWidth="025"
                                                                    borderColor="border-tertiary"
                                                                    borderRadius="200"
                                                                    background="bg-surface-active"
                                                                    shadow="300"
                                                                    padding="300"
                                                                >
                                                                    <LegacyStack spacing="tight" alignment="center">
                                                                        <Icon source={DragHandleIcon} tone="subdued" />
                                                                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                                            {activeField.label}
                                                                        </Text>
                                                                    </LegacyStack>
                                                                </Box>
                                                            </div>
                                                        )}
                                                    </DragOverlay>
                                                </DndContext>
                                            )}
                                            <Box paddingBlockStart="200">
                                                <Popover active={addFieldMenuAnchor} activator={<Button variant="primary" fullWidth icon={PlusIcon} onClick={() => setAddFieldMenuAnchor(p => !p)}>
                                                    Add Field
                                                </Button>} onClose={() => setAddFieldMenuAnchor(false)}>
                                                    <ActionList actionRole="menuitem" items={addFieldOptions.map((opt) => ({
                                                        content: opt.label,
                                                        onAction: () => handleAddField(opt.type, opt.settings, opt.label),
                                                        icon: opt.type === 'custom-title' ? TextBlockIcon
                                                            : opt.type === 'custom-image' ? PolarisImageIcon
                                                                : opt.type === 'custom-whatsapp-button' ? ChatIcon
                                                                    : opt.type === 'shopify-checkout-button' ? CartIcon
                                                                        : opt.type === 'quantity-selector' ? NoteIcon
                                                                            : opt.type === 'custom-dropdown' ? SelectIcon
                                                                                : opt.type === 'custom-single-choice' ? PolarisButtonIcon
                                                                                    : opt.type === 'custom-checkbox' ? PolarisCheckboxIcon
                                                                                        : opt.type === 'custom-date-selector' ? CalendarIcon
                                                                                            : opt.type === 'custom-link-button' ? PolarisLinkIcon
                                                                                                : opt.type === 'custom-password-field' ? PolarisLockIcon
                                                                                                    : opt.type === 'logistics-delivery' ? ShipmentIcon
                                                                                                        : PlusIcon,
                                                    }))} />
                                                </Popover>
                                            </Box>
                                        </>, SettingsIcon
                                    )}

                                    <Box paddingBlockStart="400">
                                        <Box paddingBlockStart="200" />
                                        <FormStyleEditor
                                            formStyle={formStyle}
                                            setFormStyle={setFormStyle}
                                            ColorPickerTrigger={ColorPickerTrigger}
                                            showSnack={showSnack}
                                        />
                                    </Box>
                                    {renderSection('Algerian Dinar Converter', 'dinarConverter',
                                        <BlockStack gap="400">
                                            <Text as="p" tone="subdued">
                                                Automatically display the total price in Algerian Arabic text below numerical values to improve clarity for customers.
                                            </Text>
                                            <Checkbox
                                                label="Enable price to text conversion"
                                                checked={formStyle.enableDinarConverter || false}
                                                onChange={(checked) => setFormStyle(p => ({ ...p, enableDinarConverter: checked }))}
                                            />
                                            {/* ADD THIS NEW PART */}
                                            {formStyle.enableDinarConverter && (
                                                <ChoiceList
                                                    title="Currency Symbol"
                                                    choices={[
                                                        { label: 'DA (Latin)', value: 'DA' },
                                                        { label: 'دج (Arabic)', value: 'دج' },
                                                    ]}
                                                    selected={[formStyle.currencySymbol || 'DA']}
                                                    onChange={(selection) => setFormStyle(p => ({ ...p, currencySymbol: selection[0] as 'DA' | 'دج' }))}
                                                />
                                            )}
                                            {/* END OF NEW PART */}
                                        </BlockStack>,
                                        TextBlockIcon
                                    )}
                                    {renderSection('4. Customize Form Texts', 'texts',
                                        <BlockStack gap="400">
                                            <TextField label="Required field error" value={formTexts.requiredFieldError} onChange={(v) => setFormTexts(p => ({ ...p, requiredFieldError: v }))} autoComplete="off" />
                                            <TextField label="Invalid value error" value={formTexts.invalidFieldError} onChange={(v) => setFormTexts(p => ({ ...p, invalidFieldError: v }))} autoComplete="off" />
                                        </BlockStack>, TextBlockIcon)}
                                </BlockStack>
                            )}
                            {tabValue === 'shipping' && (
                                <Card>
                                    <Box padding="400">
                                        <BlockStack gap="400">
                                            <Text variant="headingLg" as="h2">Shipping Rates</Text>
                                            <LegacyStack>
                                                <LegacyStack.Item fill><TextField label="Search rates" labelHidden placeholder="Search shipping rates" value={shippingSearchQuery} onChange={setShippingSearchQuery} autoComplete="off" /></LegacyStack.Item>
                                                <Select label="Sort by" labelHidden options={[{ label: 'Price: Low to High', value: 'price_asc' }, { label: 'Price: High to Low', value: 'price_desc' }, { label: 'Name: A to Z', value: 'name_asc' }, { label: 'Name: Z to A', value: 'name_desc' }]} value={sortBy} onChange={setSortBy} />
                                            </LegacyStack>
                                            <LegacyStack>
                                                <Button onClick={() => { setIsAddingRate(true); setEditingRate(null); }} icon={PlusIcon} disabled={isAddingRate || !!editingRate || isEditingLogistics}>Add Manual Rate</Button>
                                                <Button
                                                    onClick={() => {
                                                        if (!logisticsField) {
                                                            const newField = createLogisticsField();
                                                            setFormFields(prev => [...prev, newField]);
                                                            setTimeout(() => setIsEditingLogistics(true), 100);
                                                        } else {
                                                            setIsEditingLogistics(true);
                                                        }
                                                    }}
                                                    icon={SettingsIcon}
                                                    disabled={isAddingRate || !!editingRate || isEditingLogistics}>
                                                    Configure Logistics
                                                </Button>
                                            </LegacyStack>

                                            {isEditingLogistics && logisticsField && (
                                                <Box paddingBlockStart="400">
                                                    <LogisticsSettingsEditor
                                                        field={logisticsField}
                                                        onSettingsChange={handleFieldSettingsChange}
                                                        onCancel={() => setIsEditingLogistics(false)}
                                                        onImportRates={handleImportRates} isImporting={isImporting} />
                                                </Box>
                                            )}

                                            {(isAddingRate || editingRate) && (
                                                <ShippingRateEditor
                                                    key={editingRate ? editingRate.id : 'new'} initialData={editingRate}
                                                    onSave={(rateData) => { if (editingRate) { setShippingRates(shippingRates.map(r => r.id === editingRate.id ? { ...editingRate, ...rateData } : r)); } else { setShippingRates([...shippingRates, { ...rateData, id: `rate-${Date.now()}` }]); } setIsAddingRate(false); setEditingRate(null); }}
                                                    onCancel={() => { setIsAddingRate(false); setEditingRate(null); }}
                                                />
                                            )}
                                            {Object.entries(groupedRates).map(([groupName, rates]) => (
                                                <Fragment key={groupName}>
                                                    <Box paddingBlockStart="400">
                                                        <Card>
                                                            <div style={{ cursor: 'pointer' }} onClick={() => {
                                                                const key = `provider-${groupName}`;
                                                                setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
                                                            }}>
                                                                <Box padding="400" borderBlockEndWidth={expandedSections[`provider-${groupName}`] ? '025' : undefined} borderColor='border'>
                                                                    <LegacyStack alignment="center" distribution="equalSpacing">
                                                                        <LegacyStack alignment="center" spacing="tight">
                                                                            <Icon source={expandedSections[`provider-${groupName}`] ? ChevronUpIcon : ChevronDownIcon} />
                                                                            {(() => {
    // This helper function finds the correct logo key (e.g., 'dhd', 'noest') from the group's display name.
const getLogoKey = (name: string): LogoKey | null => {
        const lowerCaseName = name.toLowerCase();

        // Special case mappings for exact matches
        if (lowerCaseName === 'maystro delivery') return 'maystro';
        if (lowerCaseName === 'zr express') return 'zrexpress';
        if (lowerCaseName === 'colireli/procolis') return 'procolis';

        // Find a key from LOGO_URLS that is included in the group name
        const foundKey = (Object.keys(LOGO_URLS) as LogoKey[]).find(key =>
            lowerCaseName.includes(key) || key.includes(lowerCaseName.replace(/\s+/g, ''))
        );
        return foundKey || null;
    };

    const logoKey = getLogoKey(groupName);
    const logoUrl = logoKey ? LOGO_URLS[logoKey] : null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {logoUrl && (
                <img
                    src={logoUrl}
                    alt={`${groupName} Logo`}
                    style={{
                        height: '32px',
                        maxWidth: '90px',
                        objectFit: 'contain',
                    }}
                />
            )}
            <Text variant="headingMd" as="h3">{groupName}</Text>
        </div>
    );
})()}
                                                                        </LegacyStack>
                                                                        {groupName !== 'Manual' && (
                                                                            <ButtonGroup>
                                                                                <Button
                                                                                    size="slim"
                                                                                    variant="tertiary"
                                                                                    icon={RefreshIcon}
                                                                                   onClick={() => {
    handleImportRates();
}}
                                                                                    disabled={fetcher.state === 'submitting'}
                                                                                >
                                                                                    Refresh
                                                                                </Button>
                                                                                <Button
                                                                                    size="slim"
                                                                                    variant="tertiary"
                                                                                    icon={EditIcon}
                                                                                    onClick={() => {
    setIsEditingLogistics(true);
}}
                                                                                >
                                                                                    Edit Config
                                                                                </Button>
                                                                                <Button
    size="slim"
    variant="tertiary"
    tone="critical"
    icon={DeleteIcon}
    onClick={() => {
        // Ensure the main logistics field and the rates for this group exist.
        if (logisticsField && rates.length > 0) {
            // Dynamically get the provider key (e.g., 'maystro') from the first rate in the group.
            // All rates in a group share the same `apiProvider`.
            const providerToRemove = rates[0].apiProvider;

            // Failsafe in case the provider key is missing from the data.
            if (!providerToRemove) {
                console.error("Could not determine which provider to remove.");
                showSnack('error', 'Action Failed', 'Could not identify the provider.');
                return;
            }

            // Get the complete list of all currently stored rates.
            const allCurrentRates = (logisticsField.settings as LogisticsDeliverySettings).manualRates || [];

            // Create a new array that excludes rates from the provider being removed.
            const updatedRates = allCurrentRates.filter(
                (rate) => rate.apiProvider !== providerToRemove
            );

            // Update the component's state with the filtered list of rates.
            handleFieldSettingsChange(logisticsField.id, {
                manualRates: updatedRates,
            });

            // Show a success confirmation.
            showSnack('success', 'Provider Removed', `${groupName} rates have been cleared.`);
        }
    }}
>
    Remove
</Button>
                                                                            </ButtonGroup>
                                                                        )}
                                                                    </LegacyStack>
                                                                </Box>
                                                            </div>

                                                            <Collapsible
                                                                open={expandedSections[`provider-${groupName}`]}
                                                                id={`provider-${groupName}-collapsible`}
                                                                transition={{ duration: '300ms', timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
                                                            >
                                                                {groupName === 'Manual' ? (
                                                                    <IndexTable
                                                                        itemCount={rates.length}
                                                                        headings={[
                                                                            { title: 'Rate Name' },
                                                                            { title: 'Price' },
                                                                            { title: 'Conditions' },
                                                                            { title: 'Actions' },
                                                                        ]}
                                                                        selectable={false}
                                                                    >
                                                                        {rates.map((rate, index) => (
                                                                            <IndexTable.Row id={rate.id} key={rate.id} position={index}>
                                                                                <IndexTable.Cell>
                                                                                    <Text variant='bodyMd' fontWeight='semibold' as='p'>{rate.name}</Text>
                                                                                </IndexTable.Cell>
                                                                                <IndexTable.Cell>
                                                                                    {rate.price === 0 ? 'Free' : `DZ ${rate.price.toFixed(0)}`}
                                                                                </IndexTable.Cell>
                                                                                <IndexTable.Cell>
                                                                                    <Text as="p" variant='bodySm' tone='subdued'>{formatConditions(rate)}</Text>
                                                                                </IndexTable.Cell>
                                                                                <IndexTable.Cell>
                                                                                    <ButtonGroup>
                                                                                        <Button variant='plain' icon={EditIcon} onClick={() => setEditingRate(rate as ShippingRate)} />
                                                                                        <Button variant='plain' tone="critical" icon={DeleteIcon} onClick={() => {
                                                                                            setShippingRates(prev => prev.filter(r => r.id !== rate.id));
                                                                                            showSnack('success', 'Rate Deleted', 'Manual rate has been removed.');
                                                                                        }} />
                                                                                    </ButtonGroup>
                                                                                </IndexTable.Cell>
                                                                            </IndexTable.Row>
                                                                        ))}
                                                                    </IndexTable>
                                                                ) : (
                                                                    // UPDATED SECTION FOR IMPORTED RATES
                                                                    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: 'var(--p-space-400)' }}>
                                                                        {rates.map((rate, index) => {
                                                                            const extendedRate = rate as ExtendedShippingRate;
                                                                            const wilayaInfo = allWilayas.find(w => w.id == extendedRate.wilayaId);
                                                                            const wilayaCode = wilayaInfo ? String(wilayaInfo.id).padStart(2, '0') : '';
                                                                            const stopDeskPriceText = extendedRate.description?.includes('Stop Desk:')
                                                                                ? `${extendedRate.description.split('Stop Desk: ')[1]?.split(' DZD')[0]} DZD`
                                                                                : '—';

                                                                            const isExpanded = !!expandedWilayas[extendedRate.id];

                                                                            return (
                                                                                <Fragment key={extendedRate.id}>
                                                                                    <Box
                                                                                        padding="300"
                                                                                        borderWidth="025"
                                                                                        borderColor="border"
                                                                                        borderRadius="200"
                                                                                        background="bg-surface"
                                                                                        
                                                                                    >
                                                                                        <div
                                                                                            style={{ cursor: 'pointer' }}
                                                                                            onClick={() => setExpandedWilayas(prev => ({
                                                                                                ...prev,
                                                                                                [extendedRate.id]: !prev[extendedRate.id]
                                                                                            }))}
                                                                                        >
                                                                                            <LegacyStack spacing="tight" alignment="center" distribution="equalSpacing">
                                                                                                <LegacyStack spacing="tight" alignment="center">
                                                                                                    <div>
                                                                                                        <Text variant='bodyMd' fontWeight='semibold' as='p'>{extendedRate.name}</Text>
                                                                                                        {logisticsSettings?.algeriaWilayaMode === 'french' && extendedRate.wilayaNameArabic && (
                                                                                                            <Text variant='bodySm' tone='subdued' as='p'>{extendedRate.wilayaNameArabic}</Text>
                                                                                                        )}
                                                                                                        {logisticsSettings?.algeriaWilayaMode === 'arabic' && extendedRate.wilayaName && (
                                                                                                            <Text variant='bodySm' tone='subdued' as='p'>{extendedRate.wilayaName}</Text>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </LegacyStack>

                                                                                                <LegacyStack spacing="tight" alignment="center">
                                                                                                    <div style={{ textAlign: 'center', minWidth: '120px' }}>
                                                                                                        <Text as="p" variant='bodySm' tone='subdued'>Home Delivery</Text>
                                                                                                        <Text as="p" variant='bodyMd' fontWeight='medium'>{extendedRate.price.toFixed(0)} DZD</Text>
                                                                                                    </div>
                                                                                                    <div style={{ textAlign: 'center', minWidth: '120px' }}>
                                                                                                        <Text as="p" variant='bodySm' tone='subdued'>Stop Desk</Text>
                                                                                                        <Text as="p" variant='bodyMd' fontWeight='medium'>{stopDeskPriceText}</Text>
                                                                                                    </div>
                                                                                                    <Icon source={isExpanded ? ChevronUpIcon : ChevronDownIcon} />
                                                                                                </LegacyStack>
                                                                                            </LegacyStack>
                                                                                        </div>

                                                                                        <Collapsible
                                                                                            open={isExpanded}
                                                                                            id={`wilaya-${extendedRate.id}-communes`}
                                                                                            transition={{ duration: '300ms', timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
                                                                                        >
                                                                                            <Box paddingBlockStart="300">
                                                                                                <CommuneSubtable wilayaId={extendedRate.wilayaId!} />
                                                                                            </Box>
                                                                                        </Collapsible>
                                                                                    </Box>
                                                                                </Fragment>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </Collapsible>
                                                        </Card>
                                                    </Box>
                                                </Fragment>
                                            ))}

                                            {sortedRates.length === 0 && !isAddingRate && !editingRate && !isEditingLogistics && (
                                                <Box paddingBlockStart="800">
                                                    <Card>
                                                        <EmptyState
                                                            heading="No shipping rates configured"
                                                            action={{
                                                                content: 'Configure Logistics',
                                                                onAction: () => {
                                                                    if (!logisticsField) {
                                                                        const newLogisticsField = createLogisticsField();
                                                                        setFormFields(prev => [...prev, newLogisticsField]);
                                                                    }
                                                                    setIsEditingLogistics(true);
                                                                }
                                                            }}
                                                            secondaryAction={{
                                                                content: 'Add Manual Rate',
                                                                onAction: () => {
                                                                    setIsAddingRate(true);
                                                                    setEditingRate(null);
                                                                }
                                                            }}
                                                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                                        >
                                                            <Text as="p" variant="bodyMd">Set up shipping rates to start processing orders</Text>
                                                            <Box paddingBlockStart="200">
                                                                <PolarisList type="bullet">
                                                                    <PolarisList.Item>Connect to Noest or EcoTrack for automatic rate updates</PolarisList.Item>
                                                                    <PolarisList.Item>Add manual rates for custom pricing</PolarisList.Item>
                                                                    <PolarisList.Item>Support for both home delivery and stop desk options</PolarisList.Item>
                                                                </PolarisList>
                                                            </Box>
                                                        </EmptyState>
                                                    </Card>
                                                </Box>
                                            )}

                                        </BlockStack>
                                    </Box>
                                </Card>
                            )}
                        </Grid.Cell>
                        {tabValue === 'form' && (
                                <Grid.Cell columnSpan={{ xs: 6, md: 6, lg: 6, xl: 6 }}>
                                <div style={{ position: 'sticky', top: 'var(--p-space-400)', height: '85vh' }}>
                                    <PreviewForm
                                        formFields={formFields}
                                        formStyle={formStyle}
                                        formValues={formValues}
                                        setFormValues={setFormValues}
                                        formErrors={formErrors}
                                        handleSubmit={handleSubmit}
                                        previewData={previewData}
                                        handleValidation={handleValidation}
                                        passwordVisible={passwordVisible}
                                        setPasswordVisible={setPasswordVisible}
                                        allWilayas={allWilayas}
                                        shippingRates={shippingRates}
                                        isEditingPopupButton={isEditingPopupButton}
                                    />
                                </div>
                            </Grid.Cell>
                        )}
                    </Grid>
                </div>
                {snackbarMarkup}
                <InlineColorPicker
                    anchorEl={colorPickerAnchor}
                    onClose={() => setColorPickerAnchor(null)}
                    initialColor={activeColorSettingsObject ? safeColor(activeColorSettingsObject[activeColorKey]) : '#ffffff'}
                    onColorChange={activeColorCallback}
                    enableGradient={isGradientEnabled}
                />
            </Page>
        </Frame>
    );
}

// REMOVE the old CODFormDesigner component that wrapped everything in <AppProvider>

// EXPORT CODFormDesignerRoot as the default
export default CODFormDesignerRoot;
