# data-css

`data-css` là DSL CSS đặt trực tiếp trong attribute HTML/JSX. Runtime đọc `data-css`, tạo class và stylesheet tương ứng, sau đó chỉ xử lý phần DOM vừa thay đổi.

Hai package được sinh từ cùng một core:

| Package | Dùng khi |
| --- | --- |
| `data-css-js` | HTML/JavaScript thuần hoặc framework bất kỳ. |
| `data-css-react` | React; có `DataCssProvider`, phù hợp với client render và SSR. |

## Mục lục

- [Cài đặt nhanh](#cài-đặt-nhanh)
- [Cú pháp DSL](#cú-pháp-dsl)
- [HTML và JavaScript thuần](#html-và-javascript-thuần)
- [React](#react)
- [API và lifecycle](#api-và-lifecycle)
- [Cấu hình](#cấu-hình)
- [Static build / SSR](#static-build--ssr)
- [Hiệu năng, phạm vi và bảo mật](#hiệu-năng-phạm-vi-và-bảo-mật)
- [Phát triển repository](#phát-triển-repository)

## Cài đặt nhanh

Chọn một package phù hợp:

```sh
npm install data-css-js
# hoặc
npm install data-css-react
```

Runtime cần `config.json` và `base.css`. Có thể thêm `overrides.css` khi cần CSS ghi đè. Chép asset ra thư mục public của ứng dụng:

```sh
node node_modules/data-css-js/copy-assets.cjs
# hoặc
node node_modules/data-css-react/copy-assets.cjs
```

Mặc định asset nằm tại `public/data-css-js/` hoặc `public/data-css-react/`. Đổi nơi xuất bằng `--target`:

```sh
node node_modules/data-css-js/copy-assets.cjs --target public/styles/data-css
```

Sau đó khởi tạo runtime với `assetBase` trỏ đến URL public của ba file đó.

## Cú pháp DSL

### Cấu trúc cơ bản

```text
group[key:value|key:value|binding] group2[...]
```

- `group`: nhóm trong `config.json`, mặc định có `text`, `box`, `pos`, `anim`, `tf`, `cursor`.
- `key:value`: một CSS property có tên rút gọn.
- `binding`: một shortcut đã cấu hình sẵn.
- Các value trong nhóm phân cách bằng `|`; các nhóm phân cách bằng khoảng trắng.
- Dùng `_` thay cho khoảng trắng ở bên trong CSS value.

```html
<div data-css="text[cl:#1976d2|size:18px|bold] box[flex|p:12px|border:1px_solid_#dbe4f0]">
  Nội dung
</div>
```

Ví dụ trên tạo `color`, `font-size`, `font-weight`, `display`, `padding` và `border`. Các binding có sẵn thường dùng:

```html
<div data-css="text[center|uppercase|italic] box[flex|mainCenter|crossCenter]">
  Căn giữa
</div>
```

Các binding này tương ứng với `text-align: center`, `text-transform: uppercase`, `font-style: italic`, `display: flex`, `justify-content: center`, `align-items: center`.

### Class ổn định

Không có `name[...]`, runtime tự sinh class. Thêm `name[...]` khi cần selector có tên ổn định để debug, test hoặc viết CSS bổ sung:

```html
<button data-css="name[save-button] box[p:10px_16px|radius:8px] text[bold]">
  Lưu
</button>
```

Tên phải bắt đầu bằng chữ cái hoặc `_`, sau đó chỉ gồm chữ, số, `_`, `-`.

### Giá trị CSS phức tạp

Parser hiểu hàm CSS và chuỗi quote, vì vậy không tách nhầm `|` bên trong hàm. Vẫn dùng `_` cho khoảng trắng:

```html
<div data-css="box[shadow:0_8px_24px_rgba(0,0,0,0.12)|w:calc(100%_-_32px)]"></div>
```

### Responsive

Breakpoint mặc định là `mobile`, `tablet`, `desktop`; tên và query có thể thay đổi trong config.

```html
<section data-css="
  all{box[p:16px|grid|gap:12px]}
  mobile{box[gridBoxC:1fr]}
  tablet{box[gridBoxC:repeat(2,1fr)]}
  desktop{box[gridBoxC:repeat(4,1fr)]}
"></section>
```

Style bên ngoài block responsive vẫn được xem là style chung. Tuy vậy, `all{...}` được khuyến nghị vì rõ ràng hơn khi bảo trì.

### Đơn vị `w`

`w` đổi thành `vw` dựa trên `pixelCSS` của breakpoint trong config:

```html
<h1 data-css="text[size:32w]">Tiêu đề co giãn</h1>
```

Chỉ nên dùng `w` nếu design system dựa trên viewport; `px`, `rem`, `%`, `clamp()` và value CSS hợp lệ khác dùng bình thường.

### Pseudo-class: `data-pc-*`

Phần sau `data-pc-` là pseudo-class CSS:

```html
<button
  data-css="name[primary-button] box[p:10px_16px|radius:8px|bgColor:#1976d2] text[cl:#fff|bold]"
  data-pc-hover="box[bgColor:#125ea9]"
  data-pc-focus="box[shadow:0_0_0_3px_rgba(25,118,210,0.25)]"
>
  Gửi
</button>
```

Mặc định tạo `.primary-button:hover`. Có thể điều khiển bằng selector ngoài hoặc phần tử con:

```html
<div data-css="name[card] box[p:16px]" data-pc-hover="children[.title] text[cl:#1976d2]">
  <h3 class="title">Hover phần tử này</h3>
</div>

<div data-css="name[badge] text[bold]" data-pc-hover="parent[.toolbar] text[cl:red]">
  Hover .toolbar để đổi màu
</div>
```

- `children[.selector]` tạo `.card .selector:hover`.
- `parent[.selector]` tạo `.selector:hover .badge`.
- Không đặt `name`, `parent`, `children` trong rule CSS thường của `data-pc-*`.

### Pseudo-element: `data-pe-before` và `data-pe-after`

```html
<span
  data-css="name[tag] box[p:4px_8px|radius:999px|bgColor:#e8f1ff] text[cl:#125ea9]"
  data-pe-before="content[NEW] text[bold]"
>
  Sản phẩm
</span>
```

`content[...]` tạo CSS `content` cho `::before`/`::after`; phần còn lại tạo style cho pseudo-element. Pseudo-element không dùng `name`, `parent` hoặc `children`.

## HTML và JavaScript thuần

```html
<!doctype html>
<html lang="vi">
  <body>
    <main data-css="box[p:24px] text[cl:#172033]">
      <h1 data-css="text[size:28px|bold]">Xin chào</h1>
    </main>

    <script type="module">
      import { initDataCss } from 'data-css-js';

      const ready = await initDataCss({
        assetBase: '/data-css-js',
        debug: false,
      });

      if (!ready) console.error('Không thể khởi tạo data-css');
    </script>
  </body>
</html>
```

Bundler như Vite, Webpack hoặc Rollup xử lý bare import `data-css-js`. Nếu chạy HTML trực tiếp, hãy serve qua HTTP và import URL module thật thay vì bare import.

### DOM động

Runtime theo dõi subtree; node mới hoặc attribute `data-css`, `data-pc-*`, `data-pe-*` được sửa sẽ tự được compile.

```js
document.querySelector('#list').insertAdjacentHTML(
  'beforeend',
  '<li data-css="box[p:8px] text[bold]">Mục mới</li>',
);
```

Không cần gọi lại `initDataCss()`.

## React

### Client-only

Side-effect import giữ kiểu tích hợp cũ và không lỗi trên SSR (ở server nó không tải DOM runtime):

```jsx
import 'data-css-react';

export default function ProductCard() {
  return (
    <article data-css="box[p:20px|radius:12px|shadow:0_8px_24px_rgba(0,0,0,0.12)]">
      <h2 data-css="text[size:20px|bold|cl:#172033]">Tai nghe</h2>
      <button data-css="box[p:10px_14px|radius:8px|bgColor:#1976d2] text[cl:#fff|bold]">
        Thêm vào giỏ
      </button>
    </article>
  );
}
```

### `DataCssProvider` — khuyến nghị cho React/SSR

```jsx
import { DataCssProvider } from 'data-css-react/react';

export default function App() {
  return (
    <DataCssProvider
      assetBase="/data-css-react"
      debug={import.meta.env.DEV}
      onReady={() => console.log('data-css đã sẵn sàng')}
      onError={() => console.error('Không đọc được config data-css')}
    >
      <main data-css="box[p:24px]">
        <h1 data-css="text[size:28px|bold]">Ứng dụng React</h1>
      </main>
    </DataCssProvider>
  );
}
```

Provider nhận toàn bộ option của `initDataCss`: `assetBase`, `debug`, `stripAttributes`, `root`, cùng `onReady`, `onError`. Nếu truyền `root`, bảo đảm element đã tồn tại khi effect của Provider chạy.

## API và lifecycle

```ts
type DataCssInitOptions = {
  assetBase?: string;
  debug?: boolean;
  stripAttributes?: boolean;
  root?: Element | Document;
};

function initDataCss(options?: DataCssInitOptions): Promise<boolean>;
```

| Option | Ý nghĩa |
| --- | --- |
| `assetBase` | URL public chứa `config.json`, `base.css` và tùy chọn `overrides.css`. |
| `debug` | Bật chẩn đoán và kiểm tra cú pháp khi phát triển. |
| `stripAttributes` | Xóa source attributes sau compile. Chỉ dùng với DOM tĩnh. |
| `root` | Chỉ scan/observe subtree này. |

Lời gọi khởi tạo đầu tiên quyết định các option trên. Những lời gọi sau với `assetBase` khác sẽ bị bỏ qua nhằm tránh hai cấu hình cùng điều khiển một runtime. Import trên server an toàn: `initDataCss()` trả `false`.

### Chờ runtime sẵn sàng

Mỗi package export sẵn các hàm lifecycle. Chúng tự gắn với runtime của package đó, gọi được cả trước khi `initDataCss()` chạy, và trả về hàm huỷ đăng ký:

```js
import {
  initDataCss,
  getDataCssStatus,  // 'idle' | 'loading' | 'ready' | 'error'
  whenDataCssReady,  // Promise<boolean>
  onDataCssReady,    // cb(ready) — gọi cả khi thành công lẫn thất bại
  onDataCssUpdate,   // cb mỗi lần CSS cho DOM mới được chèn
  nextDataCssUpdate, // Promise: chờ lần chèn CSS kế tiếp
} from 'data-css-js'; // React: import từ 'data-css-react/react'

onDataCssReady(ready => {
  if (ready) startWidgets();
  else showFallback(); // không tải được config
});

const off = onDataCssUpdate(() => refreshDynamicUi());
off(); // ngừng nghe khi không cần nữa

container.append(card);
await nextDataCssUpdate(); // card đã có style, có thể đo kích thước
```

- `onDataCssReady` an toàn khi đăng ký muộn: nếu runtime đã xong, callback chạy ở microtask kế tiếp với kết quả cũ.
- `onDataCssUpdate` nghe liên tục cho tới khi gọi hàm huỷ.
- `nextDataCssUpdate` chỉ resolve khi có phần tử mang `data-css`, `data-pc-*` hoặc `data-pe-*` được thêm hay đổi.
- Ngoài trình duyệt (SSR), các hàm không làm gì: `getDataCssStatus()` trả `'idle'`, `whenDataCssReady()` trả `false`, callback không bao giờ được gọi.

React có thêm hook:

```jsx
import { useDataCssStatus } from 'data-css-react/react';

function Widget() {
  const status = useDataCssStatus(); // 'loading' | 'ready' | 'error'
  if (status === 'error') return <Fallback />;
  return <Chart ready={status === 'ready'} />;
}
```

### Dừng và chạy lại observer

```js
import { stopDataCss, startDataCss } from 'data-css-js';

stopDataCss();         // chỉ dừng runtime của package này
startDataCss();
await initDataCss();   // cũng tự chạy lại nếu đã dừng
```

Khi `data-css-js` và `data-css-react` cùng chạy trên một trang, mỗi package chỉ điều khiển runtime của chính nó và có thể khởi tạo song song.

### API global cũ (deprecated)

`window.dataCssReady`, `window.dataCssReadyAgain`, `window.whenDataCssReady`, `window.destroyDataCss`, `window.startDataCss` và các event `dataCssReady`, `dataCssReadyAgain`, `dataCssError` vẫn hoạt động để tương thích ngược, nhưng có các hạn chế sau:

- Chỉ tồn tại sau khi runtime tải xong.
- `dataCssReadyAgain` chỉ chạy một lần cho mỗi lần đăng ký.
- `dataCssReady` không bao giờ được gọi khi lỗi config.
- Khi có hai runtime trên trang, các hàm này điều khiển runtime nào tải sau cùng.

Hãy dùng các hàm export ở trên thay thế.

## Cấu hình

Sau khi copy asset, chỉnh `config.json` để đổi DSL mà không sửa code runtime:

```json
{
  "devMode": false,
  "assets": {
    "base": "base.css",
    "overrides": "overrides.css"
  },
  "devices": {
    "mobile": { "query": "(max-width: 700px)", "pixelCSS": "450px" },
    "desktop": { "query": "(min-width: 701px)", "pixelCSS": "1920px" }
  },
  "groups": ["text", "box", "pos", "anim", "tf", "cursor"]
}
```

- `devices`: breakpoint, media query và mốc đổi đơn vị `w`.
- `assets.base`: stylesheet nền bắt buộc, được nạp trước CSS động.
- `assets.overrides`: stylesheet được nạp sau CSS động, dành cho override có chủ ý; đặt `null` nếu muốn tắt request này.
- `groups`: manifest chỉ liệt kê tên nhóm; định nghĩa cú pháp nằm riêng tại `groups/<tên>.json`.
- `property`: CSS property camelCase, ví dụ `backgroundColor`.
- `bindings`: shortcut sinh một hoặc nhiều property/value.
- `devMode`: bật debug mặc định; `debug: true` có ưu tiên khi khởi tạo.

`base.css` luôn được nạp trước CSS động; dùng cho reset, biến CSS, font và base style. `overrides.css` được nạp sau cùng, dành cho các override có chủ ý. Có thể đặt `config.assets.overrides` là `null` nếu muốn tắt request này. Sau khi sửa config hoặc asset, reload trang để runtime đọc lại.

Khi phát triển chính repository này, không sửa `dist/*/assets/` bằng tay. Sửa `profiles/shared/config/runtime.json` cho runtime settings, hoặc từng file tại `profiles/shared/config/groups/` cho định nghĩa nhóm CSS; lệnh build sẽ xuất `config.json` cùng các file `assets/groups/*.json` riêng biệt.

## Static build / SSR

Với trang public, SEO hoặc LCP quan trọng, compile HTML/CSS trước để render đầu tiên không phải chờ browser runtime:

```sh
npx data-css-js-build src/page.html --out dist/page.html --css dist/page.data-css.css
npx data-css-react-build src/page.html --out dist/page.html --css dist/page.data-css.css
```

Builder sẽ đọc các `data-*`, giữ `name[...]` hợp lệ hoặc sinh class ổn định, tạo stylesheet, chèn `<link>` vào `<head>` và xóa source attributes ở HTML output.

```sh
npx data-css-js-build src/page.html \
  --config config/data-css.json \
  --out dist/page.html \
  --css dist/page.data-css.css
```

Builder nhận HTML, không tự render JSX. Với React SSR, dùng HTML sau bước render làm input cho builder.

## Hiệu năng, phạm vi và bảo mật

- Runtime gom mutation và chỉ compile element liên quan; rule được gom theo selector/media query.
- Giữ source attribute mặc định để UI động hoạt động. Dùng `stripAttributes: true` chỉ cho page bất biến.
- Dùng `root` cho widget hoặc micro-frontend để giảm phạm vi observer.
- Dùng static build cho route cần SEO/LCP tốt nhất.
- Không để `data-css-js` và `data-css-react` cùng kiểm soát một subtree. Khi cùng tồn tại, mỗi runtime cần `root` và `assetBase` riêng.
- Chỉ để code ứng dụng đáng tin tạo `data-css`, `data-pc-*`, `data-pe-*`. Runtime kiểm tra class name và escape pseudo-element, nhưng config có thể cho phép CSS value tải resource ngoài.

## Phát triển repository

Source dùng core chung; hai package không còn hai thư mục source độc lập:

```text
core/       runtime, parser, compiler, security, validation, static builder chung
templates/  metadata package, public entry, React provider, README từng gói
profiles/   cấu hình build; shared/config tách định nghĩa DSL theo nhóm, shared/assets chứa CSS mặc định
examples/   trang ví dụ mẫu; không đóng gói vào package
test/       unit test, browser fixture, end-to-end test
dist/       package publishable được sinh; không sửa trực tiếp
scripts/    generator package
```

Mỗi package sinh trong `dist/` được tổ chức gọn theo vai trò:

```text
index.js / index.d.ts  public API
assets/                config và base CSS được copy ra public khi cài đặt
internal/              runtime, compiler, parser, security và validation
copy-assets.cjs        công cụ chép asset
build.cjs              static HTML/CSS builder
```

```sh
npm run build:js      # sinh dist/data-css-js
npm run build:react   # sinh dist/data-css-react
npm run build         # sinh cả hai
npm test              # build + unit test hai package
npm run test:e2e      # browser regression với Playwright
npm run pack:js       # kiểm tra package JS trước publish
npm run pack:react    # kiểm tra package React trước publish
```

Xem ví dụ mẫu: chạy `npm run build`, mở một static server tại thư mục gốc repository (ví dụ `python -m http.server`) rồi truy cập `/examples/js/index.html` hoặc `/examples/react/index.html`. Ví dụ React tải React từ CDN qua import map và biên dịch JSX ngay trong trình duyệt, nên cần mạng; ứng dụng thật nên dùng bundler.

Chỉ publish từ `dist/data-css-js` hoặc `dist/data-css-react`. Xem thêm [CORE.md](CORE.md) để biết quy trình build core/profile.

## License

MIT
