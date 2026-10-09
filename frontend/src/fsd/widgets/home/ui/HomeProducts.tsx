'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function HomeProducts({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<section className="products" id="products">
        <div className="container">
            <Localized as="h2" translationKey="products_title" className="section-title" data-i18n="products_title">{"Credits packages"}</Localized>
            <div className="products-grid animate-on-scroll" id="productsGrid"></div>
        </div>
    </section>); }
