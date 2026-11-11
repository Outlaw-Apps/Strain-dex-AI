export async function updateFunctionConfig(api, functionId, providerRootDirectory) {
  const current = await api.get({ functionId });
  if (current.providerRootDirectory === providerRootDirectory && current.commands === "npm ci") return current;
  return api.update({ ...current, functionId, providerRootDirectory, commands: "npm ci" });
}
