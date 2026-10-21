import {Children,cloneElement,isValidElement} from 'react';
import type {ReactNode,ReactElement} from 'react';
import {translate} from '../game/i18n';
import type {Language} from '../game/i18n';
export function localize(node:ReactNode,language:Language):ReactNode{
  if(language==='en')return node;
  if(typeof node==='string')return translate(node,language);
  if(!isValidElement(node))return node;
  const element=node as ReactElement<Record<string,unknown>&{children?:ReactNode}>;
  const attributes:Record<string,unknown>={};
  for(const name of ['aria-label','title','placeholder'])if(typeof element.props[name]==='string')attributes[name]=translate(element.props[name] as string,language);
  if(element.props.children===undefined)return cloneElement(element,attributes);
  return cloneElement(element,attributes,Children.map(element.props.children,child=>localize(child,language)));
}
