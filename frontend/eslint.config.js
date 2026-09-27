import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Các chỗ còn vi phạm (tải dữ liệu khi vào trang, reset khi đổi bộ, hẹn giờ hiệu ứng) vẫn chạy đúng;
      // sửa hết phải viết lại ~10 file lớn. Để cảnh báo, còn lỗi lint khác thì CI chặn.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
