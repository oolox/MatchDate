import promptSvg from '../../../assets/icons/prompt.svg?raw';
import caretDownSvg from '../../../assets/icons/caret-down.svg?raw';
import caretUpSvg from '../../../assets/icons/caret-up.svg?raw';
import closeSvg from '../../../assets/icons/close.svg?raw';
import generateSvg from '../../../assets/icons/generate.svg?raw';
import imageSvg from '../../../assets/icons/image.svg?raw';
import modelSvg from '../../../assets/icons/model.svg?raw';
import searchSvg from '../../../assets/icons/search.svg?raw';
import sendSvg from '../../../assets/icons/send.svg?raw';
import sortSvg from '../../../assets/icons/sort.svg?raw';
import starSvg from '../../../assets/icons/star.svg?raw';
import starFilledSvg from '../../../assets/icons/star-filled.svg?raw';
import tagSvg from '../../../assets/icons/tag.svg?raw';
import textFileSvg from '../../../assets/icons/text-file.svg?raw';
import videoSvg from '../../../assets/icons/video.svg?raw';

export const iconSources = {
  send: sendSvg,
  generate: generateSvg,
  close: closeSvg,
  star: starSvg,
  'star-filled': starFilledSvg,
  search: searchSvg,
  sort: sortSvg,
  'caret-up': caretUpSvg,
  'caret-down': caretDownSvg,
  'text-file': textFileSvg,
  image: imageSvg,
  video: videoSvg,
  tag: tagSvg,
  model: modelSvg,
  prompt: promptSvg,
} as const;

export type IconName = keyof typeof iconSources;
