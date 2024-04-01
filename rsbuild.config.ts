import { defineConfig } from '@rsbuild/core';

export default defineConfig({

    tools: {

        htmlPlugin: false

    },

    output: {

        polyfill: 'off',

        filenameHash: false,

        copy: [
            { from: './client/src/views', to: './' },
            { from: './client/src/css', to: './css' },
            { from: './client/src/libs', to: './js/lib' },
            { from: './client/src/assets', to: './assets' }
        ],

        distPath: {

            root: './client/dist',
            js: './js',
            html: './',
            css: './css'

        },

        sourceMap: {
            js: "source-map"
        }

    },

    source: {

        tsconfigPath: './client/tsconfig.json',

        entry: {

            index: './client/src/index'

        }

    }

});
