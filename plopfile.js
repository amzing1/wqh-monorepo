module.exports = (plop) => {
  plop.setGenerator('vue app', {
    description: '生成自定义vue app',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: '请输入vue app名称'
      },
      {
        type: 'input',
        name: 'author',
        message: '请输入 app 作者'
      },
      {
        type: 'input',
        name: 'version',
        message: '请输入组件初始版本号',
        default: '1.0.0'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'apps/{{name}}/package.json',
        templateFile: 'template/package.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{name}}/tsconfig.json',
        templateFile: 'template/tsconfig.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{name}}/vite.config.ts',
        templateFile: 'template/vite.config.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{name}}/tailwind.config.ts',
        templateFile: 'template/tailwind.config.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{name}}/postcss.config.ts',
        templateFile: 'template/postcss.config.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{name}}/index.html',
        templateFile: 'apps/{{name}}/index.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{name}}/src/index.ts',
        templateFile: 'template/src/index.hbs'
      }
    ]
  });
};
