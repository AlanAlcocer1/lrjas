const base = import.meta.env.BASE_URL;

export const BRAND = {
  colors: {
    leaf: '#84BD31',
    leafDark: '#4B7914',
    leafDarker: '#006837',
    white: '#FFFFFF',
  },
  images: {
    imagotipoGreen: `${base}images/LRJAS%20Imagotipo%20verde.png`,
    imagotipoWhite: `${base}images/LRJAS%20Imagotipo%20blanco.png`,
    isotipoGreen: `${base}images/LRJAS%20Isotipo%20verde.png`,
  },
} as const;
