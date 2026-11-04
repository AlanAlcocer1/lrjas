/**
 * Textos estáticos de la cápsula.
 * Las fotos del reel vienen de la API (`/anniversary-memories`);
 * En prod no se inyectan mockups: la lista viene solo de la API.
 */

export const brand = {
  name: 'LRJAS',
  fullName: 'Lugar de Reunión de Jóvenes Adultos Solteros',
  logo: '/images/imagotipo-verde.png',
  logoWhite: '/images/imagotipo-blanco.png',
  siteUrl: 'https://lrjasmerida.me',
  yearStart: '20',
  yearEnd: '26',
  cornerBottomLeft: 'LR',
  cornerBottomRight: 'JAS',
};

/**
 * Aniversario: LRJAS nació el 27 de noviembre de 2024 y cumple dos años el
 * 27 de noviembre de 2026. La cápsula cuenta el segundo año, mes a mes.
 */
export const anniversary = {
  years: 2,
  yearsLabel: 'Dos años',
  founded: '2024-11-27',
  /** Inicio del año que cuenta la cápsula (primer capítulo). */
  start: '2025-11-27',
  /** Día del aniversario (cierra el último capítulo). */
  date: '2026-11-27',
  /** Rango permitido en el calendario al subir un recuerdo. */
  uploadMin: '2025-11-01',
  uploadMax: '2026-12-31',
};

export type Scene = {
  id: string;
  kicker: string;
  title: string;
  /** Índices de palabras del título que van en itálica (acento editorial). */
  emphasis?: number[];
  /** Párrafo breve bajo el título. */
  body?: string;
  tone?: 'sky' | 'leaf' | 'cream' | 'deep';
};

export const scenes: Scene[] = [
  {
    id: 'open',
    kicker: 'Cápsula del tiempo',
    title: 'Dos años juntos',
    emphasis: [0],
    body: 'LRJAS cumple dos años. Esta cápsula los celebra con los recuerdos de quienes estuvieron ahí.',
    tone: 'sky',
  },
  {
    id: 'journey',
    kicker: 'Mérida · Yucatán',
    title: 'Una historia hecha de encuentros',
    emphasis: [4],
    body: 'Hace dos años abrimos la puerta en Mérida. Cada reunión sumó nombres, historias y amistades nuevas.',
    tone: 'cream',
  },
  {
    id: 'recap',
    kicker: 'Miramos atrás',
    title: 'Celebramos el camino',
    emphasis: [0],
    body: 'Doce capítulos con tus fotos, ordenadas en el tiempo: así se siente cumplir dos años.',
    tone: 'leaf',
  },
];

/** Encabezado del archivo de recuerdos (fotos de la comunidad). */
export const archiveScene: Scene = {
  id: 'archive',
  kicker: 'Archivo vivo',
  title: 'Celebramos dos años',
  emphasis: [1],
  body: 'Doce capítulos con cantidades parejas, ordenados por fecha. Cada foto la subió alguien que estuvo ahí.',
};

/** Cierre del epílogo. */
export const celebration = {
  title: 'Dos años, y los celebramos juntos',
  emphasis: [1],
  body: 'Gracias por cada reunión, cada servicio y cada noche de conversación. Esto apenas empieza.',
};

/**
 * Invitación al LRJAS FEST (aniversario).
 * Pega el URL de YouTube en `youtubeUrl` (watch, youtu.be o embed).
 */
export const baileJas = {
  eyebrow: 'LRJAS FEST',
  title: 'Ven a celebrar el aniversario',
  emphasis: [2],
  body:
    'Este 27 de noviembre nos reunimos en el LRJAS FEST para celebrar dos años de LRJAS. Música, amigos y la noche que cierra (y abre) la historia.',
  dateLabel: '27 de noviembre de 2026',
  /** Ej. https://www.youtube.com/watch?v=XXXX o https://youtu.be/XXXX */
  youtubeUrl: 'https://youtu.be/qIMd_vESXyw',
};

/** Puente entre el archivo y el epílogo. */
export const bridgeScene: Scene = {
  id: 'bridge',
  kicker: 'Dos años',
  title: 'Y seguimos escribiendo la historia',
  emphasis: [4],
  tone: 'deep',
};

export type MemoryPhoto = {
  id: string;
  src: string;
  caption: string;
  side: 'odd' | 'even';
  authorName?: string;
  memoryDate?: string;
};

export type ChapterStory = {
  title: string;
  /** Índices de palabras en itálica. */
  emphasis?: number[];
  body: string;
};

/** Un texto nostálgico distinto por cada uno de los 12 capítulos (sin meses). */
export const chapterStories: ChapterStory[] = [
  {
    title: 'Donde empezó todo',
    emphasis: [2],
    body: 'Aquellas primeras risas todavía suenan. No sabíamos que estábamos guardando el comienzo.',
  },
  {
    title: 'Luz entre amigos',
    emphasis: [0],
    body: 'Cuando el día se apaga, queda lo que importa: estar juntos y sentir que hay hogar.',
  },
  {
    title: 'Caras que se quedan',
    emphasis: [0],
    body: 'Quienes un día fueron desconocidos hoy tienen lugar en la mesa y en el corazón.',
  },
  {
    title: 'Promesas en voz baja',
    emphasis: [0],
    body: 'Abrazos cortos, planes largos. Lo pequeño también construye lo que somos.',
  },
  {
    title: 'El sabor de estar juntos',
    emphasis: [3],
    body: 'Pan compartido, historias a media voz. Hay recuerdos que se miden en platos vacíos.',
  },
  {
    title: 'Corazones en movimiento',
    emphasis: [2],
    body: 'Correr, saltar, celebrar. El cuerpo también reza cuando la comunidad juega.',
  },
  {
    title: 'Algo que florece',
    emphasis: [2],
    body: 'Creció sin pedir permiso: amistades que ya no caben en una sola tarde.',
  },
  {
    title: 'Talento y ternura',
    emphasis: [2],
    body: 'Alguien cantó, alguien escuchó. En LRJAS hasta el silencio aplaude.',
  },
  {
    title: 'Manos que sirven',
    emphasis: [2],
    body: 'Salimos a dar y volvimos más llenos. El servicio nos deja huella en las fotos.',
  },
  {
    title: 'Bajo las estrellas',
    emphasis: [2],
    body: 'Canciones, miradas y esa certeza suave de no estar solos en la noche.',
  },
  {
    title: 'Puertas abiertas',
    emphasis: [1],
    body: 'Llegaron miradas nuevas y el círculo se hizo más ancho sin romperse.',
  },
  {
    title: 'Dos años en el pecho',
    emphasis: [0],
    body: 'Miramos atrás y sonreímos. Esto no es el final: es la prueba de que valió la pena.',
  },
];

/**
 * Solo para demos locales (`?demo=1` si se cablea). En prod la cápsula empieza
 * vacía y se llena conforme suben recuerdos reales.
 */
export const fallbackMemories: MemoryPhoto[] = [
  { id: 'm01', src: '/images/memories/m01.svg', caption: 'Primeros círculos', side: 'odd', memoryDate: '2025-11-28', authorName: 'Ana' },
  { id: 'm02', src: '/images/memories/m02.svg', caption: 'Noche de juegos', side: 'even', memoryDate: '2025-12-15', authorName: 'Luis' },
  { id: 'm03', src: '/images/memories/m03.svg', caption: 'Servicio juntos', side: 'odd', memoryDate: '2026-01-20', authorName: 'María' },
  { id: 'm04', src: '/images/memories/m04.svg', caption: 'Devocional al aire', side: 'even', memoryDate: '2026-02-14', authorName: 'Diego' },
  { id: 'm05', src: '/images/memories/m05.svg', caption: 'Cena compartida', side: 'odd', memoryDate: '2026-03-10', authorName: 'Sofía' },
  { id: 'm06', src: '/images/memories/m06.svg', caption: 'Deportes LRJAS', side: 'even', memoryDate: '2026-04-05', authorName: 'Carlos' },
  { id: 'm07', src: '/images/memories/m07.svg', caption: 'Retiro de primavera', side: 'odd', memoryDate: '2026-05-12', authorName: 'Elena' },
  { id: 'm08', src: '/images/memories/m08.svg', caption: 'Noche de talentos', side: 'even', memoryDate: '2026-06-18', authorName: 'Jorge' },
  { id: 'm09', src: '/images/memories/m09.svg', caption: 'Misión local', side: 'odd', memoryDate: '2026-07-22', authorName: 'Paula' },
  { id: 'm10', src: '/images/memories/m10.svg', caption: 'Fogata y canciones', side: 'even', memoryDate: '2026-08-16', authorName: 'Andrés' },
  { id: 'm11', src: '/images/memories/m11.svg', caption: 'Bienvenida a nuevos', side: 'odd', memoryDate: '2026-09-09', authorName: 'Valeria' },
  { id: 'm12', src: '/images/memories/m12.svg', caption: 'Gracias por dos años', side: 'even', memoryDate: '2026-10-27', authorName: 'LRJAS' },
];

export type AfterBlock = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export const afterBlocks: AfterBlock[] = [
  {
    id: 'actividades',
    eyebrow: 'Dos años',
    title: 'Encuentros que suman',
    body: 'Juegos, servicio, deporte y noches de conversación. Así se construyó LRJAS.',
  },
  {
    id: 'amistad',
    eyebrow: 'Comunidad',
    title: 'Caras conocidas, hogar compartido',
    body: 'Amistades que nacieron en un círculo y siguen en el día a día.',
  },
  {
    id: 'fe',
    eyebrow: 'Fe y propósito',
    title: 'Creciendo juntos',
    body: 'Estudio, oración y servicio: la brújula que nos acompaña en estos dos años.',
  },
];
