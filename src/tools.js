import path from 'path';
import debug from 'debug';
import axios from 'axios';
import fs from 'fs/promises';
import { load } from 'cheerio';

const attrMapper = {
  img: 'src',
  link: 'href',
  script: 'src',
};

export const logger = debug('page-loader');

export const getFileName = (url) => {
  const { host, pathname } = new URL(url);
  const [path, extension] = pathname.split('.');
  const fileName = `${host}${path}`.replace(/[^\d+\w]/g, '-');
  return extension ?  `${fileName}.${extension}` : fileName;
}

export const getFilesDirName = (fileName) => `${fileName}_files`;

export const getAssetName = (url) => (url ? url.split('-').pop() : undefined);

export const isFile = (url) => url ? getAssetName(url).split('.')[1] : false;

export const getAssetPaths = (urls, output) => urls.map((url) => {
  const assetName = getFileName(url);
  return path.join(output, assetName);
});

export const getPaths = (urls, relativePath, absolutePath) => ({
  relative: getAssetPaths(urls, relativePath),
  absolute: getAssetPaths(urls, absolutePath),
});

export const replaceUrls = (html, tag, replacementPaths) => {
  console.log('🚀 : replaceUrls : replacementPaths:', replacementPaths);
  const $ = load(html);
  const assets = Array.from($(tag));
  replacementPaths.forEach((replacePath) => {
    const assetName = getAssetName(replacePath);
    console.log('🚀 : replacementPaths.forEach : assetName:', assetName);
    const elements = assets.filter((el) => getAssetName($(el).attr(attrMapper[tag])) === assetName);
    elements.forEach((element) => $(element).attr(attrMapper[tag], replacePath));
  });
  return $.html();
};

export const writeFile = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
    .then(() => fs.writeFile(filePath, data));
  return filePath;
};

export const downloadFile = async (fileUrl, filePath) => {
  logger('Downloading file', fileUrl);
  const { data } = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  return writeFile(filePath, data);
};

export const downloadAssets = async (urls, absolutePaths) => {
  await Promise.allSettled(urls.map((url, index) => downloadFile(url, absolutePaths[index])));
};

export const extractUrlsByTag = (html, origin, tag) => {
  const $ = load(html);
  const assets = $(tag);
  return Array.from(assets)
    .map((el) => $(el).attr(attrMapper[tag]))
    .filter((url) => String(url).startsWith('/') || isFile(url))
    .map((pathname) => (new URL(pathname, origin)).toString());
};
