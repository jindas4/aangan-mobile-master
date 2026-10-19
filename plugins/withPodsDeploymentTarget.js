// Raise every CocoaPods target's minimum iOS version to the app's own (15.1).
//
// Some libraries (Google Sign-In, Sentry, SDWebImage, …) still declare iOS 9–12.
// Xcode 26 only warned about that; Xcode 27 rejects anything below 15 and the
// EAS "latest" image now uses it, so the build fails. Raising the pods to the
// app's own minimum changes nothing for users — the app already needs 15.1.
const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const MARKER = "# aangan: pods deployment target";

module.exports = function withPodsDeploymentTarget(config, target = "15.1") {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let src = fs.readFileSync(podfile, "utf8");
      if (!src.includes(MARKER)) {
        const hook = /post_install do \|installer\|\n/;
        if (!hook.test(src)) throw new Error("withPodsDeploymentTarget: no post_install block in Podfile");
        src = src.replace(hook, (m) => m +
          `    ${MARKER}\n` +
          `    installer.pods_project.targets.each do |t|\n` +
          `      t.build_configurations.each do |c|\n` +
          `        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${target}\n` +
          `          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${target}'\n` +
          `        end\n` +
          `      end\n` +
          `    end\n`);
        fs.writeFileSync(podfile, src);
      }
      return cfg;
    },
  ]);
};
