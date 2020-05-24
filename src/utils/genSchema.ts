import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import {
  makeExecutableSchema,
  mergeResolvers,
  mergeTypeDefs,
} from "graphql-tools";

export const genSchema = () => {
  const pathToModules = path.join(__dirname, "../modules");

  const graphqlTypes = glob
    .sync(`${pathToModules}/**/*.graphql`)
    .map((x) => fs.readFileSync(x, { encoding: "utf8" }));

  const resolvers = glob
    .sync(`${pathToModules}/**/resolvers.?s`)
    .map((resolver) => require(resolver).resolvers);

  return makeExecutableSchema({
    typeDefs: mergeTypeDefs(graphqlTypes),
    resolvers: mergeResolvers(resolvers),
  });
};
