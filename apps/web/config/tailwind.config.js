/**
 * Copied from supabase/supabase config package.
 */

const ui = require('./ui.config.js')
const deepMerge = require('deepmerge')
const plugin = require('tailwindcss/plugin')

const color = {
  'colors-black': {
    cssVariable: 'var(--core-colors-black)',
    value: 'hsl(0, 0%, 0%)',
  },
  'colors-white': {
    cssVariable: 'var(--core-colors-white)',
    value: 'hsl(0, 0%, 100%)',
  },
  'colors-gray-dark-100': {
    cssVariable: 'var(--core-colors-gray-dark-100)',
    value: 'hsl(0, 0%, 8.6%)',
  },
  'colors-gray-dark-200': {
    cssVariable: 'var(--core-colors-gray-dark-200)',
    value: 'hsl(0, 0%, 11%)',
  },
  'colors-gray-dark-300': {
    cssVariable: 'var(--core-colors-gray-dark-300)',
    value: 'hsl(0, 0%, 13.7%)',
  },
  'colors-gray-dark-400': {
    cssVariable: 'var(--core-colors-gray-dark-400)',
    value: 'hsl(0, 0%, 15.7%)',
  },
  'colors-gray-dark-500': {
    cssVariable: 'var(--core-colors-gray-dark-500)',
    value: 'hsl(0, 0%, 18%)',
  },
  'colors-gray-dark-600': {
    cssVariable: 'var(--core-colors-gray-dark-600)',
    value: 'hsl(0, 0%, 20.4%)',
  },
  'colors-gray-dark-700': {
    cssVariable: 'var(--core-colors-gray-dark-700)',
    value: 'hsl(0, 0%, 24.3%)',
  },
  'colors-gray-dark-800': {
    cssVariable: 'var(--core-colors-gray-dark-800)',
    value: 'hsl(0, 0%, 31.4%)',
  },
  'colors-gray-dark-900': {
    cssVariable: 'var(--core-colors-gray-dark-900)',
    value: 'hsl(0, 0%, 43.9%)',
  },
  'colors-gray-dark-1000': {
    cssVariable: 'var(--core-colors-gray-dark-1000)',
    value: 'hsl(0, 0%, 49.4%)',
  },
  'colors-gray-dark-1100': {
    cssVariable: 'var(--core-colors-gray-dark-1100)',
    value: 'hsl(0, 0%, 62.7%)',
  },
  'colors-gray-dark-1200': {
    cssVariable: 'var(--core-colors-gray-dark-1200)',
    value: 'hsl(0, 0%, 92.9%)',
  },
  'colors-gray-dark-alpha-100': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-100)',
    value: 'hsla(0, 0%, 0%, 0)',
  },
  'colors-gray-dark-alpha-200': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-200)',
    value: 'hsla(0, 0%, 100%, 0.03137254901960784)',
  },
  'colors-gray-dark-alpha-300': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-300)',
    value: 'hsla(0, 0%, 100%, 0.058823529411764705)',
  },
  'colors-gray-dark-alpha-400': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-400)',
    value: 'hsla(0, 0%, 100%, 0.0784313725490196)',
  },
  'colors-gray-dark-alpha-500': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-500)',
    value: 'hsla(0, 0%, 100%, 0.10196078431372549)',
  },
  'colors-gray-dark-alpha-600': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-600)',
    value: 'hsla(0, 0%, 100%, 0.12941176470588237)',
  },
  'colors-gray-dark-alpha-700': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-700)',
    value: 'hsla(0, 0%, 100%, 0.16862745098039217)',
  },
  'colors-gray-dark-alpha-800': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-800)',
    value: 'hsla(0, 0%, 100%, 0.25098039215686274)',
  },
  'colors-gray-dark-alpha-900': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-900)',
    value: 'hsla(0, 0%, 100%, 0.38823529411764707)',
  },
  'colors-gray-dark-alpha-1000': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-1000)',
    value: 'hsla(0, 0%, 100%, 0.45098039215686275)',
  },
  'colors-gray-dark-alpha-1100': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-1100)',
    value: 'hsla(0, 0%, 100%, 0.5882352941176471)',
  },
  'colors-gray-dark-alpha-1200': {
    cssVariable: 'var(--core-colors-gray-dark-alpha-1200)',
    value: 'hsla(0, 0%, 100%, 0.9215686274509803)',
  },
  'colors-gray-light-100': {
    cssVariable: 'var(--core-colors-gray-light-100)',
    value: 'hsl(0, 0%, 98.8%)',
  },
  'colors-gray-light-200': {
    cssVariable: 'var(--core-colors-gray-light-200)',
    value: 'hsl(0, 0%, 97.3%)',
  },
  'colors-gray-light-300': {
    cssVariable: 'var(--core-colors-gray-light-300)',
    value: 'hsl(0, 0%, 95.3%)',
  },
  'colors-gray-light-400': {
    cssVariable: 'var(--core-colors-gray-light-400)',
    value: 'hsl(0, 0%, 92.9%)',
  },
  'colors-gray-light-500': {
    cssVariable: 'var(--core-colors-gray-light-500)',
    value: 'hsl(0, 0%, 91%)',
  },
  'colors-gray-light-600': {
    cssVariable: 'var(--core-colors-gray-light-600)',
    value: 'hsl(0, 0%, 88.6%)',
  },
  'colors-gray-light-700': {
    cssVariable: 'var(--core-colors-gray-light-700)',
    value: 'hsl(0, 0%, 85.9%)',
  },
  'colors-gray-light-800': {
    cssVariable: 'var(--core-colors-gray-light-800)',
    value: 'hsl(0, 0%, 78%)',
  },
  'colors-gray-light-900': {
    cssVariable: 'var(--core-colors-gray-light-900)',
    value: 'hsl(0, 0%, 56.1%)',
  },
  'colors-gray-light-1000': {
    cssVariable: 'var(--core-colors-gray-light-1000)',
    value: 'hsl(0, 0%, 52.2%)',
  },
  'colors-gray-light-1100': {
    cssVariable: 'var(--core-colors-gray-light-1100)',
    value: 'hsl(0, 0%, 43.5%)',
  },
  'colors-gray-light-1200': {
    cssVariable: 'var(--core-colors-gray-light-1200)',
    value: 'hsl(0, 0%, 9%)',
  },
  'colors-gray-light-alpha-100': {
    cssVariable: 'var(--core-colors-gray-light-alpha-100)',
    value: 'hsla(0, 0%, 0%, 0.011764705882352941)',
  },
  'colors-gray-light-alpha-200': {
    cssVariable: 'var(--core-colors-gray-light-alpha-200)',
    value: 'hsla(0, 0%, 0%, 0.03137254901960784)',
  },
  'colors-gray-light-alpha-300': {
    cssVariable: 'var(--core-colors-gray-light-alpha-300)',
    value: 'hsla(0, 0%, 0%, 0.050980392156862744)',
  },
  'colors-gray-light-alpha-400': {
    cssVariable: 'var(--core-colors-gray-light-alpha-400)',
    value: 'hsla(0, 0%, 0%, 0.07058823529411765)',
  },
  'colors-gray-light-alpha-500': {
    cssVariable: 'var(--core-colors-gray-light-alpha-500)',
    value: 'hsla(0, 0%, 0%, 0.09019607843137255)',
  },
  'colors-gray-light-alpha-600': {
    cssVariable: 'var(--core-colors-gray-light-alpha-600)',
    value: 'hsla(0, 0%, 0%, 0.10980392156862745)',
  },
  'colors-gray-light-alpha-700': {
    cssVariable: 'var(--core-colors-gray-light-alpha-700)',
    value: 'hsla(0, 0%, 0%, 0.1411764705882353)',
  },
  'colors-gray-light-alpha-800': {
    cssVariable: 'var(--core-colors-gray-light-alpha-800)',
    value: 'hsla(0, 0%, 0%, 0.2196078431372549)',
  },
  'colors-gray-light-alpha-900': {
    cssVariable: 'var(--core-colors-gray-light-alpha-900)',
    value: 'hsla(0, 0%, 0%, 0.4392156862745098)',
  },
  'colors-gray-light-alpha-1000': {
    cssVariable: 'var(--core-colors-gray-light-alpha-1000)',
    value: 'hsla(0, 0%, 0%, 0.47843137254901963)',
  },
  'colors-gray-light-alpha-1100': {
    cssVariable: 'var(--core-colors-gray-light-alpha-1100)',
    value: 'hsla(0, 0%, 0%, 0.5607843137254902)',
  },
  'colors-gray-light-alpha-1200': {
    cssVariable: 'var(--core-colors-gray-light-alpha-1200)',
    value: 'hsla(0, 0%, 0%, 0.9098039215686274)',
  },
  'colors-slate-dark-100': {
    cssVariable: 'var(--core-colors-slate-dark-100)',
    value: 'hsl(200, 6.7%, 8.8%)',
  },
  'colors-slate-dark-200': {
    cssVariable: 'var(--core-colors-slate-dark-200)',
    value: 'hsl(195, 7.1%, 11%)',
  },
  'colors-slate-dark-300': {
    cssVariable: 'var(--core-colors-slate-dark-300)',
    value: 'hsl(192, 7.2%, 13.5%)',
  },
  'colors-slate-dark-400': {
    cssVariable: 'var(--core-colors-slate-dark-400)',
    value: 'hsl(204, 6.2%, 15.9%)',
  },
  'colors-slate-dark-500': {
    cssVariable: 'var(--core-colors-slate-dark-500)',
    value: 'hsl(200, 6.5%, 18%)',
  },
  'colors-slate-dark-600': {
    cssVariable: 'var(--core-colors-slate-dark-600)',
    value: 'hsl(205.70000000000005, 6.7%, 20.6%)',
  },
  'colors-slate-dark-700': {
    cssVariable: 'var(--core-colors-slate-dark-700)',
    value: 'hsl(202.5, 6.5%, 24.3%)',
  },
  'colors-slate-dark-800': {
    cssVariable: 'var(--core-colors-slate-dark-800)',
    value: 'hsl(206.70000000000005, 5.6%, 31.6%)',
  },
  'colors-slate-dark-900': {
    cssVariable: 'var(--core-colors-slate-dark-900)',
    value: 'hsl(205.70000000000005, 6.3%, 43.9%)',
  },
  'colors-slate-dark-1000': {
    cssVariable: 'var(--core-colors-slate-dark-1000)',
    value: 'hsl(207.70000000000005, 5.1%, 49.6%)',
  },
  'colors-slate-dark-1100': {
    cssVariable: 'var(--core-colors-slate-dark-1100)',
    value: 'hsl(207.29999999999995, 5.8%, 62.9%)',
  },
  'colors-slate-dark-1200': {
    cssVariable: 'var(--core-colors-slate-dark-1200)',
    value: 'hsl(210, 5.6%, 92.9%)',
  },
  'colors-slate-dark-alpha-100': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-100)',
    value: 'hsla(0, 0%, 0%, 0)',
  },
  'colors-slate-dark-alpha-200': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-200)',
    value: 'hsla(181.39999999999998, 100%, 91.8%, 0.03137254901960784)',
  },
  'colors-slate-dark-alpha-300': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-300)',
    value: 'hsla(181.60000000000002, 86.4%, 91.4%, 0.058823529411764705)',
  },
  'colors-slate-dark-alpha-400': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-400)',
    value: 'hsla(208.89999999999998, 87.1%, 93.9%, 0.0784313725490196)',
  },
  'colors-slate-dark-alpha-500': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-500)',
    value: 'hsla(200, 88.2%, 93.3%, 0.10980392156862745)',
  },
  'colors-slate-dark-alpha-600': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-600)',
    value: 'hsla(209, 93.9%, 93.5%, 0.1411764705882353)',
  },
  'colors-slate-dark-alpha-700': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-700)',
    value: 'hsla(203.20000000000005, 100%, 93.9%, 0.1803921568627451)',
  },
  'colors-slate-dark-alpha-800': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-800)',
    value: 'hsla(208.79999999999995, 92.6%, 94.7%, 0.25882352941176473)',
  },
  'colors-slate-dark-alpha-900': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-900)',
    value: 'hsla(208, 100%, 94.1%, 0.4117647058823529)',
  },
  'colors-slate-dark-alpha-1000': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-1000)',
    value: 'hsla(210, 100%, 95.3%, 0.47058823529411764)',
  },
  'colors-slate-dark-alpha-1100': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-1100)',
    value: 'hsla(210, 100%, 96.9%, 0.6196078431372549)',
  },
  'colors-slate-dark-alpha-1200': {
    cssVariable: 'var(--core-colors-slate-dark-alpha-1200)',
    value: 'hsla(210, 100%, 99.6%, 0.9294117647058824)',
  },
  'colors-slate-light-100': {
    cssVariable: 'var(--core-colors-slate-light-100)',
    value: 'hsl(210, 33.3%, 98.8%)',
  },
  'colors-slate-light-200': {
    cssVariable: 'var(--core-colors-slate-light-200)',
    value: 'hsl(210, 16.7%, 97.6%)',
  },
  'colors-slate-light-300': {
    cssVariable: 'var(--core-colors-slate-light-300)',
    value: 'hsl(210, 16.7%, 95.3%)',
  },
  'colors-slate-light-400': {
    cssVariable: 'var(--core-colors-slate-light-400)',
    value: 'hsl(210, 11.8%, 93.3%)',
  },
  'colors-slate-light-500': {
    cssVariable: 'var(--core-colors-slate-light-500)',
    value: 'hsl(216, 11.1%, 91.2%)',
  },
  'colors-slate-light-600': {
    cssVariable: 'var(--core-colors-slate-light-600)',
    value: 'hsl(205.70000000000005, 12.3%, 88.8%)',
  },
  'colors-slate-light-700': {
    cssVariable: 'var(--core-colors-slate-light-700)',
    value: 'hsl(210, 11.1%, 85.9%)',
  },
  'colors-slate-light-800': {
    cssVariable: 'var(--core-colors-slate-light-800)',
    value: 'hsl(205, 10.7%, 78%)',
  },
  'colors-slate-light-900': {
    cssVariable: 'var(--core-colors-slate-light-900)',
    value: 'hsl(205.70000000000005, 6.3%, 56.1%)',
  },
  'colors-slate-light-1000': {
    cssVariable: 'var(--core-colors-slate-light-1000)',
    value: 'hsl(205.70000000000005, 5.7%, 52.2%)',
  },
  'colors-slate-light-1100': {
    cssVariable: 'var(--core-colors-slate-light-1100)',
    value: 'hsl(205.70000000000005, 6.3%, 43.5%)',
  },
  'colors-slate-light-1200': {
    cssVariable: 'var(--core-colors-slate-light-1200)',
    value: 'hsl(201.79999999999995, 24.4%, 8.8%)',
  },
  'colors-slate-light-alpha-100': {
    cssVariable: 'var(--core-colors-slate-light-alpha-100)',
    value: 'hsla(209.79999999999995, 92.6%, 26.5%, 0.0196078431372549)',
  },
  'colors-slate-light-alpha-200': {
    cssVariable: 'var(--core-colors-slate-light-alpha-200)',
    value: 'hsla(210, 87.8%, 16.1%, 0.03137254901960784)',
  },
  'colors-slate-light-alpha-300': {
    cssVariable: 'var(--core-colors-slate-light-alpha-300)',
    value: 'hsla(209.60000000000002, 100%, 14.3%, 0.050980392156862744)',
  },
  'colors-slate-light-alpha-400': {
    cssVariable: 'var(--core-colors-slate-light-alpha-400)',
    value: 'hsla(210.60000000000002, 93%, 11.2%, 0.0784313725490196)',
  },
  'colors-slate-light-alpha-500': {
    cssVariable: 'var(--core-colors-slate-light-alpha-500)',
    value: 'hsla(215.29999999999995, 92.7%, 10.8%, 0.10196078431372549)',
  },
  'colors-slate-light-alpha-600': {
    cssVariable: 'var(--core-colors-slate-light-alpha-600)',
    value: 'hsla(205.70000000000005, 96.6%, 11.4%, 0.12941176470588237)',
  },
  'colors-slate-light-alpha-700': {
    cssVariable: 'var(--core-colors-slate-light-alpha-700)',
    value: 'hsla(209.39999999999998, 100%, 10%, 0.1607843137254902)',
  },
  'colors-slate-light-alpha-800': {
    cssVariable: 'var(--core-colors-slate-light-alpha-800)',
    value: 'hsla(204.5, 96.1%, 10%, 0.23921568627450981)',
  },
  'colors-slate-light-alpha-900': {
    cssVariable: 'var(--core-colors-slate-light-alpha-900)',
    value: 'hsla(206, 100%, 5.9%, 0.47058823529411764)',
  },
  'colors-slate-light-alpha-1000': {
    cssVariable: 'var(--core-colors-slate-light-alpha-1000)',
    value: 'hsla(204.39999999999998, 100%, 5.3%, 0.5098039215686274)',
  },
  'colors-slate-light-alpha-1100': {
    cssVariable: 'var(--core-colors-slate-light-alpha-1100)',
    value: 'hsla(205, 100%, 4.7%, 0.5882352941176471)',
  },
  'colors-slate-light-alpha-1200': {
    cssVariable: 'var(--core-colors-slate-light-alpha-1200)',
    value: 'hsla(200, 100%, 2.4%, 0.9294117647058824)',
  },
  'variables-colors-brand-primary': {
    cssVariable: 'var(--core-variables-colors-brand-primary)',
    value: 'hsl(153.10000000000002, 60.2%, 52.7%)',
  },
  'variables-colors-brand-accent': {
    cssVariable: 'var(--core-variables-colors-brand-accent)',
    value: 'hsl(152.89999999999998, 56.1%, 46.5%)',
  },
  'foreground-DEFAULT': {
    cssVariable: 'var(--foreground-default)',
    value: 'hsl(0, 0%, 98%)',
  },
  'foreground-light': {
    cssVariable: 'var(--foreground-light)',
    value: 'hsl(0, 0%, 70.6%)',
  },
  'foreground-lighter': {
    cssVariable: 'var(--foreground-lighter)',
    value: 'hsl(0, 0%, 53.7%)',
  },
  'foreground-muted': {
    cssVariable: 'var(--foreground-muted)',
    value: 'hsl(0, 0%, 30.2%)',
  },
  'foreground-contrast': {
    cssVariable: 'var(--foreground-contrast)',
    value: 'hsl(0, 0%, 8.6%)',
  },
  'background-200': {
    cssVariable: 'var(--background-200)',
    value: 'hsl(0, 0%, 9%)',
  },
  'background-DEFAULT': {
    cssVariable: 'var(--background-default)',
    value: 'hsl(0, 0%, 7.1%)',
  },
  'background-alternative-200': {
    cssVariable: 'var(--background-alternative-200)',
    value: 'hsl(0, 0%, 11%)',
  },
  'background-alternative-DEFAULT': {
    cssVariable: 'var(--background-alternative-default)',
    value: 'hsl(0, 0%, 5.9%)',
  },
  'background-selection': {
    cssVariable: 'var(--background-selection)',
    value: 'hsl(0, 0%, 19.2%)',
  },
  'background-control': {
    cssVariable: 'var(--background-control)',
    value: 'hsl(0, 0%, 14.1%)',
  },
  'background-surface-75': {
    cssVariable: 'var(--background-surface-75)',
    value: 'hsl(0, 0%, 9%)',
  },
  'background-surface-100': {
    cssVariable: 'var(--background-surface-100)',
    value: 'hsl(0, 0%, 12.2%)',
  },
  'background-surface-200': {
    cssVariable: 'var(--background-surface-200)',
    value: 'hsl(0, 0%, 12.9%)',
  },
  'background-surface-300': {
    cssVariable: 'var(--background-surface-300)',
    value: 'hsl(0, 0%, 16.1%)',
  },
  'background-surface-400': {
    cssVariable: 'var(--background-surface-400)',
    value: 'hsl(0, 0%, 16.1%)',
  },
  'background-overlay-DEFAULT': {
    cssVariable: 'var(--background-overlay-default)',
    value: 'hsl(0, 0%, 14.1%)',
  },
  'background-overlay-hover': {
    cssVariable: 'var(--background-overlay-hover)',
    value: 'hsl(0, 0%, 18%)',
  },
  'background-muted': {
    cssVariable: 'var(--background-muted)',
    value: 'hsl(0, 0%, 14.1%)',
  },
  'background-button-DEFAULT': {
    cssVariable: 'var(--background-button-default)',
    value: 'hsl(0, 0%, 18%)',
  },
  'background-dialog-DEFAULT': {
    cssVariable: 'var(--background-dialog-default)',
    value: 'hsl(0, 0%, 7.1%)',
  },
  'border-DEFAULT': {
    cssVariable: 'var(--border-default)',
    value: 'hsl(0, 0%, 16.1%)',
  },
  'border-muted': {
    cssVariable: 'var(--border-muted)',
    value: 'hsl(0, 0%, 14.1%)',
  },
  'border-secondary': {
    cssVariable: 'var(--border-secondary)',
    value: 'hsl(0, 0%, 14.1%)',
  },
  'border-overlay': {
    cssVariable: 'var(--border-overlay)',
    value: 'hsl(0, 0%, 20%)',
  },
  'border-control': {
    cssVariable: 'var(--border-control)',
    value: 'hsl(0, 0%, 22.4%)',
  },
  'border-alternative': {
    cssVariable: 'var(--border-alternative)',
    value: 'hsl(0, 0%, 26.7%)',
  },
  'border-strong': {
    cssVariable: 'var(--border-strong)',
    value: 'hsl(0, 0%, 20%)',
  },
  'border-stronger': {
    cssVariable: 'var(--border-stronger)',
    value: 'hsl(0, 0%, 22%)',
  },
  'border-button-DEFAULT': {
    cssVariable: 'var(--border-button-default)',
    value: 'hsl(0, 0%, 24.3%)',
  },
  'border-button-hover': {
    cssVariable: 'var(--border-button-hover)',
    value: 'hsl(0, 0%, 31.4%)',
  },
  'destructive-200': {
    cssVariable: 'var(--destructive-200)',
    value: 'hsl(10.899999999999977, 23.4%, 9.2%)',
  },
  'destructive-300': {
    cssVariable: 'var(--destructive-300)',
    value: 'hsl(7.5, 51.3%, 15.3%)',
  },
  'destructive-400': {
    cssVariable: 'var(--destructive-400)',
    value: 'hsl(6.699999999999989, 60%, 20.6%)',
  },
  'destructive-500': {
    cssVariable: 'var(--destructive-500)',
    value: 'hsl(7.899999999999977, 71.6%, 29%)',
  },
  'destructive-600': {
    cssVariable: 'var(--destructive-600)',
    value: 'hsl(9.699999999999989, 85.2%, 62.9%)',
  },
  'destructive-DEFAULT': {
    cssVariable: 'var(--destructive-default)',
    value: 'hsl(10.199999999999989, 77.9%, 53.9%)',
  },
  'warning-200': {
    cssVariable: 'var(--warning-200)',
    value: 'hsl(36.60000000000002, 100%, 8%)',
  },
  'warning-300': {
    cssVariable: 'var(--warning-300)',
    value: 'hsl(32.30000000000001, 100%, 10.2%)',
  },
  'warning-400': {
    cssVariable: 'var(--warning-400)',
    value: 'hsl(33.19999999999999, 100%, 14.5%)',
  },
  'warning-500': {
    cssVariable: 'var(--warning-500)',
    value: 'hsl(34.80000000000001, 90.9%, 21.6%)',
  },
  'warning-600': {
    cssVariable: 'var(--warning-600)',
    value: 'hsl(38.89999999999998, 100%, 42.9%)',
  },
  'warning-DEFAULT': {
    cssVariable: 'var(--warning-default)',
    value: 'hsl(38.89999999999998, 100%, 42.9%)',
  },
  'brand-200': {
    cssVariable: 'var(--brand-200)',
    value: 'hsl(162, 100%, 2%)',
  },
  'brand-300': {
    cssVariable: 'var(--brand-300)',
    value: 'hsl(155.10000000000002, 100%, 8%)',
  },
  'brand-400': {
    cssVariable: 'var(--brand-400)',
    value: 'hsl(155.5, 100%, 9.6%)',
  },
  'brand-500': {
    cssVariable: 'var(--brand-500)',
    value: 'hsl(154.89999999999998, 100%, 19.2%)',
  },
  'brand-600': {
    cssVariable: 'var(--brand-600)',
    value: 'hsl(154.89999999999998, 59.5%, 70%)',
  },
  'brand-DEFAULT': {
    cssVariable: 'var(--brand-default)',
    value: 'hsl(153.10000000000002, 60.2%, 52.7%)',
  },
  'brand-button': {
    cssVariable: 'var(--brand-button)',
    value: 'hsl(154.89999999999998, 100%, 19.2%)',
  },
  'brand-link': {
    cssVariable: 'var(--brand-link)',
    value: 'hsl(155, 100%, 38.6%)',
  },
  '_secondary-200': {
    cssVariable: 'var(--secondary-200)',
    value: 'hsl(248, 53.6%, 11%)',
  },
  '_secondary-400': {
    cssVariable: 'var(--secondary-400)',
    value: 'hsl(248.29999999999995, 54.5%, 25.9%)',
  },
  '_secondary-DEFAULT': {
    cssVariable: 'var(--secondary-default)',
    value: 'hsl(247.79999999999995, 100%, 70%)',
  },
  'code_block-1': {
    cssVariable: 'var(--code-block-1)',
    value: 'hsl(170.79999999999995, 43.1%, 61.4%)',
  },
  'code_block-2': {
    cssVariable: 'var(--code-block-2)',
    value: 'hsl(33.19999999999999, 90.3%, 75.7%)',
  },
  'code_block-3': {
    cssVariable: 'var(--code-block-3)',
    value: 'hsl(83.80000000000001, 61.7%, 63.1%)',
  },
  'code_block-4': {
    cssVariable: 'var(--code-block-4)',
    value: 'hsl(276.1, 67.7%, 74.5%)',
  },
  'code_block-5': {
    cssVariable: 'var(--code-block-5)',
    value: 'hsl(13.800000000000011, 89.7%, 69.6%)',
  },
}

/**
 *
 */
let colorExtend = {}
Object.values(color).map((x, i) => {
  colorExtend[Object.keys(color)[i]] = `hsl(${x.cssVariable} / <alpha-value>)` // x.cssVariable
})

// console.log('colorExtend', colorExtend)
// console.log('colorExtend kebabToNested', kebabToNested(colorExtend))

// console.log('colorExtend', kebabToNested(colorExtend).colors.gray)

/**
 * Generates Tailwind colors for the theme
 * adds <alpha-value> as part of the hsl value
 */
function generateTwColorClasses(globalKey, twAttributes) {
  let classes = {}
  Object.values(twAttributes).map((attr, i) => {
    const attrKey = Object.keys(twAttributes)[i]

    if (attrKey.includes(globalKey)) {
      const keySplit = attrKey.split('-').splice(1).join('-')

      let payload = {
        [keySplit]: `hsl(${attr.cssVariable} / <alpha-value>)`,
      }

      if (keySplit == 'DEFAULT') {
        // includes a 'default' duplicate
        // this allows for classes like `border-default` which is the same as `border`
        payload = {
          ...payload,
          default: `hsl(${attr.cssVariable} / <alpha-value>)`,
        }
      }

      classes = {
        ...classes,
        ...payload,
      }
    }
  })
  /**
   * mutate object into nested object for tailwind theme structure
   */
  const nestedClasses = kebabToNested(classes)
  // return, but nest the keys if they are kebab case named
  return nestedClasses
}

/**
 * Helper to convert kebab named keys in object to nested nodes
 */
function kebabToNested(obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('-')
    let currentObj = result
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] === 'DEFAULT' ? parts[i] : parts[i].toLowerCase() // convert key to lowercase
      if (!currentObj[part]) {
        currentObj[part] = {}
      }
      if (i === parts.length - 1) {
        if (typeof value === 'object') {
          currentObj[part] = kebabToNested(value) // recursively convert nested objects
        } else {
          currentObj[part] = value.toString().toLowerCase() // convert value to lowercase
        }
      } else {
        currentObj = currentObj[part]
      }
    }
  }
  return result
}

/**
 * Main theme config
 */
const uiConfig = ui({
  mode: 'JIT',
  darkMode: ['class', '[data-theme*="dark"]'],
  theme: {
    /**
     * Spread all theme colors and custom generated colors into theme
     */
    textColor: (theme) => ({
      ...theme('colors'),
      ...generateTwColorClasses('foreground', color),
    }),
    backgroundColor: (theme) => ({
      ...theme('colors'),
      ...generateTwColorClasses('background', color),
      /*
       * custom background re-maps
       */
      studio: `hsl(var(--background-200)/ <alpha-value>)`,
    }),
    borderColor: (theme) => ({
      ...theme('colors'),
      ...generateTwColorClasses('border', color),
    }),
    extend: {
      colors: {
        ...kebabToNested(colorExtend),
      },

      typography: ({ theme }) => ({
        // Removal of backticks in code blocks for tailwind v3.0
        // https://github.com/tailwindlabs/tailwindcss-typography/issues/135
        DEFAULT: {
          css: {
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            '--tw-prose-body': 'hsl(var(--foreground-light))',
            '--tw-prose-headings': 'hsl(var(--foreground-default))',
            '--tw-prose-lead': 'hsl(var(--foreground-light))',
            '--tw-prose-links': 'hsl(var(--foreground-light))',
            '--tw-prose-bold': 'hsl(var(--foreground-light))',
            '--tw-prose-counters': 'hsl(var(--foreground-light))',
            '--tw-prose-bullets': 'hsl(var(--foreground-muted))',
            '--tw-prose-hr': 'hsl(var(--background-surface-300))',
            '--tw-prose-quotes': 'hsl(var(--foreground-light))',
            '--tw-prose-quote-borders': 'hsl(var(--background-surface-300))',
            '--tw-prose-captions': 'hsl(var(--border-strong))',
            '--tw-prose-code': 'hsl(var(--foreground-default))',
            '--tw-prose-pre-code': 'hsl(var(--foreground-muted))',
            '--tw-prose-pre-bg': 'hsl(var(--background-surface-200))',
            '--tw-prose-th-borders': 'hsl(var(--background-surface-300))',
            '--tw-prose-td-borders': 'hsl(var(--background-default))',
            '--tw-prose-invert-body': 'hsl(var(--background-default))',
            '--tw-prose-invert-headings': theme('colors.white'),
            '--tw-prose-invert-lead': 'hsl(var(--background-surface-300))',
            '--tw-prose-invert-links': theme('colors.white'),
            '--tw-prose-invert-bold': theme('colors.white'),
            '--tw-prose-invert-counters': 'hsl(var(--background-surface-200))',
            '--tw-prose-invert-bullets': 'hsl(var(--background-selection))',
            '--tw-prose-invert-hr': 'hsl(var(--border-strong))',
            '--tw-prose-invert-quotes': 'hsl(var(--background-alternative-default))',
            '--tw-prose-invert-quote-borders': 'hsl(var(--border-strong))',
            '--tw-prose-invert-captions': 'hsl(var(--background-surface-200))',
            // the following are typography overrides
            // examples can be seen here —> https://github.com/tailwindlabs/tailwindcss-typography/blob/master/src/styles.js
            // reset all header font weights
            h4: {
              // override font size
              fontSize: '1.15em',
            },
            h5: {
              // h5 not included in --tw-prose-headings
              color: theme('colors.scale[1200]'),
            },
            'h1, h2, h3, h4, h5, h6': {
              fontWeight: '400',
            },
            'article h2, article h3, article h4, article h5, article h6': {
              marginTop: '2em',
              marginBottom: '1em',
            },
            p: {
              fontWeight: '400',
            },
            pre: {
              background: 'none',
              padding: 0,
              marginBottom: '32px',
            },
            ul: {
              listStyleType: 'none',
              paddingLeft: '1rem',
            },
            'ul li': {
              position: 'relative',
            },
            'ul li::before': {
              position: 'absolute',
              top: '0.75rem',
              left: '-1rem',
              height: '0.125rem',
              width: '0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: 'hsl(var(--border-strong))',
              content: '""',
            },
            ol: {
              paddingLeft: '1rem',
              counterReset: 'item',
              listStyleType: 'none',
              marginBottom: '3rem',
            },
            'ol>li': {
              display: 'block',
              position: 'relative',
              paddingLeft: '1rem',
            },
            'ol>li::before': {
              position: 'absolute',
              top: '0.25rem',
              left: '-1rem',
              height: '1.2rem',
              width: '1.2rem',
              borderRadius: '0.25rem',
              backgroundColor: 'hsl(var(--background-surface-100))',
              border: '1px solid hsl(var(--border-default))',
              content: 'counter(item) "  "',
              counterIncrement: 'item',
              fontSize: '12px',
              color: 'hsl(var(--foreground-muted))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },

            'p img': {
              border: '1px solid hsl(var(--border-muted))',
              borderRadius: '4px',
              overflow: 'hidden',
            },
            iframe: {
              border: '1px solid ' + theme('borderColor.DEFAULT'),
              borderRadius: theme('borderRadius.lg'),
            },
            td: {
              borderBottom: '1px solid ' + 'hsl(var(--background-surface-200))',
            },
            code: {
              fontWeight: '400',
              padding: '0.2rem 0.4rem',
              backgroundColor: 'hsl(var(--background-surface-200))',
              border: '1px solid ' + 'hsl(var(--background-surface-300))',
              borderRadius: theme('borderRadius.lg'),
              // wordBreak: 'break-all',
            },
            a: {
              position: 'relative',
              transition: 'all 0.18s ease',
              paddingBottom: '2px',
              fontWeight: '400',
              opacity: 1,
              color: 'hsl(var(--foreground-default))',
              textDecorationLine: 'underline',
              textDecorationColor: 'hsl(var(--foreground-muted))',
              textDecorationThickness: '1px',
              textUnderlineOffset: '2px',
            },
            'a:hover': {
              textDecorationColor: 'hsl(var(--foreground-default))',
            },
            figcaption: {
              color: 'hsl(var(--foreground-muted))',
              fontFamily: 'Office Code Pro, monospace',
            },
            'figure.quote-figure p:first-child': {
              marginTop: '0 !important',
            },
            'figure.quote-figure p:last-child': {
              marginBottom: '0 !important',
            },
            figure: {
              margin: '3rem 0',
            },
            'figure img': {
              margin: '0 !important',
            },
          },
        },

        toc: {
          css: {
            ul: {
              'list-style-type': 'none',
              'padding-left': 0,
              margin: 0,
              li: {
                'padding-left': 0,
              },
              a: {
                display: 'block',
                marginBottom: '0.4rem',
                'text-decoration': 'none',
                fontSize: '0.8rem',
                fontWeight: '200',
                color: 'hsl(var(--foreground-light))',
                '&:hover': {
                  color: 'hsl(var(--foreground-default))',
                },
                'font-weight': '400',
              },
              // margin: 0,
              ul: {
                'list-style-type': 'none',
                li: {
                  marginTop: '0.2rem',
                  marginBottom: '0.2rem',
                  'padding-left': '0 !important',
                  'margin-left': '0.5rem',
                },
                a: {
                  fontWeight: '200',
                  color: 'hsl(var(--foreground-lighter))',
                  '&:hover': {
                    color: 'hsl(var(--foreground-default))',
                  },
                },
              },
            },
          },
        },
        // used in auto docs
        docs: {
          css: {
            '--tw-prose-body': 'hsl(var(--foreground-light))',
            '--tw-prose-headings': 'hsl(var(--foreground-default))',
            '--tw-prose-lead': 'hsl(var(--foreground-light))',
            '--tw-prose-links': 'hsl(var(--brand-500))',
            '--tw-prose-bold': 'hsl(var(--foreground-light))',
            '--tw-prose-counters': 'hsl(var(--foreground-light))',
            '--tw-prose-bullets': 'hsl(var(--foreground-muted))',
            '--tw-prose-hr': 'hsl(var(--background-surface-300))',
            '--tw-prose-quotes': 'hsl(var(--foreground-light))',
            '--tw-prose-quote-borders': 'hsl(var(--background-surface-300))',
            '--tw-prose-captions': 'hsl(var(--border-strong))',
            '--tw-prose-code': 'hsl(var(--foreground-default))',
            '--tw-prose-pre-code': 'hsl(var(--foreground-muted))',
            '--tw-prose-pre-bg': 'hsl(var(--background-surface-200))',
            '--tw-prose-th-borders': 'hsl(var(--background-surface-300))',
            '--tw-prose-td-borders': 'hsl(var(--background-default))',
            '--tw-prose-invert-body': 'hsl(var(--background-default))',
            '--tw-prose-invert-headings': theme('colors.white'),
            '--tw-prose-invert-lead': 'hsl(var(--background-surface-300))',
            '--tw-prose-invert-links': theme('colors.white'),
            '--tw-prose-invert-bold': theme('colors.white'),
            '--tw-prose-invert-counters': 'hsl(var(--background-surface-200))',
            '--tw-prose-invert-bullets': 'hsl(var(--background-selection))',
            '--tw-prose-invert-hr': 'hsl(var(--border-strong))',
            '--tw-prose-invert-quotes': 'hsl(var(--background-alternative-default))',
            '--tw-prose-invert-quote-borders': 'hsl(var(--border-strong))',
            '--tw-prose-invert-captions': 'hsl(var(--background-surface-200))',
            // the following are typography overrides
            // examples can be seen here —> https://github.com/tailwindlabs/tailwindcss-typography/blob/master/src/styles.js
            // reset all header font weights
            'h1, h2, h3, h4, h5': {
              fontWeight: '400',
            },
          },
        },
      }),
      screens: {
        xs: '480px',
      },
      fontFamily: {
        sans: ['Circular', 'custom-font', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Office Code Pro', 'Source Code Pro', 'Menlo', 'monospace'],
      },

      // shadcn defaults START
      keyframes: {
        'flash-code': {
          '0%': { backgroundColor: 'rgba(63, 207, 142, 0.1)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'collapsible-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'flash-code': 'flash-code 1s forwards',
        'flash-code-slow': 'flash-code 2s forwards',
        'accordion-down': 'accordion-down 0.15s ease-out',
        'accordion-up': 'accordion-up 0.15s ease-out',
        'collapsible-down': 'collapsible-down 0.10s ease-out',
        'collapsible-up': 'collapsible-up 0.10s ease-out',
      },
      borderRadius: {
        // lg: `var(--radius)`,
        // md: `calc(var(--radius) - 2px)`,
        // sm: 'calc(var(--radius) - 4px)',
        panel: '6px',
      },
      padding: {
        content: '21px',
      },
      // borderRadius: {
      //   lg: `var(--radius)`,
      //   md: `calc(var(--radius) - 2px)`,
      //   sm: 'calc(var(--radius) - 4px)',
      // },
      // fontFamily: {
      //   sans: ['var(--font-sans)', ...fontFamily.sans],
      // },
      // shadcn defaults END
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
    plugin(motionSafeTransition),
  ],
})

/**
 * Plugin to add `safe` versions of the `transition-*` properties, which respect
 * `prefers-reduced-motion`.
 *
 * When users prefer reduced motion, the duration of transform transitions is
 * reduced to something negiglible (1ms). The original `transition-*` properties
 * aren't overridden to provide flexibility, in situations where you want to
 * handle the `prefers-reduced-motion` case some other way.
 *
 * See https://css-tricks.com/levels-of-fix/.
 *
 * Usage: <div className="transition-safe duration-safe-100">
 *        - Transitioned properties will animate with duration 100, _except_
 *          transform properties when prefers-reduced-motion is on, which
 *          will animate instantaneously.
 *
 * Note:
 *   - `duration-safe` must be used with `transition-safe`
 *   - Non-safe `duration` must be used with non-safe `transition`
 *   - (Cannot be mixed)
 */
function motionSafeTransition({ addUtilities, matchUtilities, theme }) {
  addUtilities({
    '.transition-safe': {
      transitionProperty:
        'color, transform, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, filter, backdrop-filter',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      transitionDuration: '150ms',
      '@media (prefers-reduced-motion)': {
        transitionDuration:
          '150ms, 1ms, 150ms, 150ms, 150ms, 150ms, 150ms, 150ms, 150ms, 150s, 150ms',
      },
    },
    '.transition-safe-all': {
      transitionProperty: 'all, transform',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      transitionDuration: '150ms',
      '@media (prefers-reduced-motion)': {
        transitionDuration: '150ms, 1ms',
      },
    },
    '.transition-safe-transform': {
      /**
       * The duplicate `transform` here is a hacky way of dealing with the fact
       * that `transform` must be second in `transition-safe-all` to override
       * `all`, and its order must be the same across all `transition-safe-*`
       * classes, so the proper duration applies in `duration-safe`.
       */
      transitionProperty: 'transform, transform',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      transitionDuration: '150ms',
      '@media (prefers-reduced-motion)': {
        transitionDuration: '1ms',
      },
    },
  })

  matchUtilities(
    {
      'duration-safe': (value) => ({
        transitionDuration: value,
        '@media (prefers-reduced-motion)': {
          /**
           * Preserves the indicated duration for everything except `transform`.
           *
           * Relies on browsers truncating the `transition-duration` property
           * if there are more values than there are transitioned properties.
           */
          transitionDuration: `${value}, 1ms, ${value}, ${value}, ${value}, ${value}, ${value}, ${value}, ${value}, ${value}, ${value}`,
        },
      }),
    },
    { values: theme('transitionDuration') }
  )
}

function arrayMergeFn(destinationArray, sourceArray) {
  return destinationArray.concat(sourceArray).reduce((acc, cur) => {
    if (acc.includes(cur)) return acc
    return [...acc, cur]
  }, [])
}

/**
 * Merge Supabase UI and Tailwind CSS configurations
 * @param {object} tailwindConfig - Tailwind config object
 * @return {object} new config object
 */
function wrapper(tailwindConfig) {
  return deepMerge({ ...tailwindConfig }, uiConfig, {
    arrayMerge: arrayMergeFn,
  })
}

module.exports = wrapper
