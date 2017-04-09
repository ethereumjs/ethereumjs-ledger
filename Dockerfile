FROM node:6

COPY package.json /app/package.json
WORKDIR /app
RUN yarn install

COPY tsconfig.json /app/tsconfig.json
COPY source/ /app/source/
COPY tests/ /app/tests/
COPY typings/ /app/typings/

RUN yarn run build

ENTRYPOINT [ "yarn", "test" ]
