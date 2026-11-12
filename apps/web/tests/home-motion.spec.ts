import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures';
test('homepage motion follows scroll and respects reduced motion', async ({page}) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('#loginBtn')).toBeEnabled();
  await expect(page.locator('.gx-hero h1')).toContainText('Different AI models.');
  await expect(page.locator('.gx-workspace-frame img')).toHaveJSProperty('naturalWidth',2560);
  await expect(page.getByRole('button',{name:'Pause background motion'})).toHaveCount(0);
  await expect(page.locator('.gx-page-progress,.gx-workspace-open')).toHaveCount(0);
  const before = await page.locator('.gx-workspace-frame').evaluate(el=>getComputedStyle(el).transform);
  await page.mouse.wheel(0,700);
  await expect(page.locator('.gx-home')).toHaveClass(/gx-nav-compact/);
  await expect.poll(()=>page.locator('.gx-workspace-frame').evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.gx-code-field')).toHaveCSS('display','none');
  await expect(page.locator('.gx-light-a')).toHaveCSS('animation-name','none');
  await page.locator('#products').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY));
  await expect(page.locator('.navbar a[href="#products"]')).toHaveAttribute('aria-current','location');
  await page.locator('#about').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY));
  await expect(page.locator('.navbar a[href="#about"]')).toHaveAttribute('aria-current','location');
  await expect(page.locator('.gx-footer-column a[href="/policies/privacy-policy.html"]')).toHaveText('Privacy policy');
});
test('homepage defaults to English and fits a narrow screen',async({page})=>{
  await mockApi(page);
  await page.addInitScript(()=>{localStorage.removeItem('appLang');Object.defineProperty(navigator,'language',{value:'uk-UA'});});
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('#loginBtn')).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('.gx-hero h1')).toContainText('Different AI models.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await expect(page.locator('.gx-workspace-frame')).toHaveAttribute('href','/chat');
});

test('workspace story scrubs in both directions and keeps the interface opaque',async({page})=>{
  await mockApi(page);
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await expect(page.locator('#productsGrid .product-card').first()).toBeVisible();
  const initialScale = await page.locator('.gx-workspace-frame').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
  expect(initialScale).toBeLessThan(.9);
  const sceneRange = await page.locator('.gx-workspace-scene').evaluate(el=>{
    const top=el.getBoundingClientRect().top+scrollY;
    const sticky=el.querySelector<HTMLElement>('.gx-workspace-sticky')!;
    return {start:top-innerHeight*.85,end:top+el.getBoundingClientRect().height-sticky.offsetHeight-parseFloat(getComputedStyle(sticky).top)-180};
  });
  const scrubTo = async(progress:number)=>{
    await page.evaluate(y=>window.scrollTo(0,y),sceneRange.start+(sceneRange.end-sceneRange.start)*progress);
  };
  await scrubTo(.35);
  await expect.poll(()=>page.locator('.gx-story-one').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.98);
  await scrubTo(.65);
  await expect.poll(()=>page.locator('.gx-story-two').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.98);
  await scrubTo(.35);
  await expect.poll(()=>page.locator('.gx-story-one').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.98);
  await scrubTo(1);
  await expect.poll(()=>page.locator('.gx-workspace-frame').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(1.12);
  expect((await page.locator('.gx-workspace-frame').boundingBox())!.y).toBeGreaterThan(90);
  await expect(page.locator('.gx-workspace-frame')).toHaveCSS('opacity','1');
  await expect(page.locator('.gx-scene-progress')).toHaveCount(0);
  await expect(page.locator('.gx-scene-footer')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await expect(page.locator('.gx-workspace-frame')).toHaveCSS('transform','none');
  await expect(page.locator('.gx-story-one')).toHaveCSS('opacity','1');
});

test('dark chat uses the Genyxo ink palette',async({page})=>{
  await mockApi(page);
  await page.addInitScript(()=>localStorage.setItem('theme','dark'));
  await page.goto('/');
  await page.locator('.gx-actions a[href="/chat"]').click();
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await expect(page.locator('.main-container')).toHaveCSS('background-color','rgb(12, 13, 13)');
  await expect(page.locator('.main-container')).toHaveCSS('background-image','none');
  await expect(page.locator('#sidebar')).toHaveCSS('background-color','rgb(7, 8, 8)');
});

test('catalogue cards replay when returning and stay visible after disabling motion',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  const firstCard=page.locator('#productsGrid .product-card').first();
  await expect(firstCard).toBeVisible();
  await page.locator('#productsGrid').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-200));
  await expect(firstCard).toHaveCSS('opacity','1');
  await page.locator('#about').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY+150));
  await expect(firstCard).toHaveCSS('opacity','0');
  await page.locator('#productsGrid').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-200));
  await expect(firstCard).toHaveCSS('opacity','1');
  await page.locator('#home').evaluate(()=>window.scrollTo(0,0));
  await expect(firstCard).toHaveCSS('opacity','0');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(firstCard).toHaveCSS('opacity','1');
});
