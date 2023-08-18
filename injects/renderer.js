// 运行在 Electron 渲染进程 下的页面脚本
const { plugin: pluginPath, data: dataPath } = LiteLoader.plugins.qqencodeMsg.path;

function log(...args) {
  console.log(`[Msg Encode Renderer]`, ...args);
  qqencodeMsg.writelog(...args);
}

function decodeMsgText(targetElement, settings) {
  const key = settings.key;
  const decodeMode = settings.decodeMode;
  const errorDisplayRaw = settings.errorDisplayRaw;
  // 判断是否存在消息
  if (!targetElement) {
    log("否存在消息");
    return;
  }
  // 判断是否消息内容标签
  if (targetElement.tagName !== "P") {
    log("否消息p标签");
  }
  // 判断消息是否被加密
  if (targetElement.innerText.indexOf("pge:") !== 0) {
    log("否被加密");
    return;
  }
  // 判断消息是否已转换
  if (targetElement.innerText.includes("\n\n\n解密：\n")) {
    log("已转换");
    return;
  }
  // 备份原消息
  var rawText = targetElement.innerText;
  rawText = rawText.slice(4);
  // 添加提示
  targetElement.innerText = `${rawText}\n发现加密消息：\n解密中...`;
  decodeMsg(rawText, key)
    .then((text) => {
      if (text.indexOf("pgd:") !== 0) {
        text = "结果文本错误!";
        if (errorDisplayRaw) {
          text = rawText;
        }
      } else {
        text = text.slice(4);
      }
      // 转换模式
      switch (decodeMode) {
        case 0:
          targetElement.innerText = `${rawText}\n解密：\n${text}`;
          break;
        case 1:
          targetElement.innerText = `${text}\n原文：\n${rawText}`;
          break;
        case 2:
          targetElement.innerText = `${text}`;
          break;
        case 3:
          break;
        default:
          targetElement.innerText = `${rawText}\n解密：\n${text}`;
          break;
      }
    })
    .catch((error) => {
      targetElement.innerText = `${rawText}\n\n\n解密：\n转换失败！`;
      console.error(error);
    });
}

function encodeMsgForwardText(targetElement, key) {
  // 判断是否存在消息
  if (!targetElement) {
    log("否存在消息");
    return;
  }
  // 判断是否消息内容标签
  if (targetElement.tagName !== "P") {
    log("否消息p标签");
  }
  // 备份原消息
  var rawText = targetElement.innerText;
  if (rawText === "") return;
  encodeMsg("pgd:" + rawText, key)
    .then(async (encodedText) => {
      log(encodedText);
      const peer = await LLAPI.getPeer();
      const elements = [{
        type: "text",
        content: `pge:${encodedText}`
      }];
      log(elements);
      await LLAPI.sendMessage(peer, elements);
    })
    .catch((error) => {
      console.error(error);
    });
}

const decodeMsg = (text, key) => {
  return new Promise((resolve, reject) => {
    qqencodeMsg.decrypt(text, key).then((Msg) => {
      resolve(Msg);
    });
  });
};

const encodeMsg = (text, key) => {
  return new Promise((resolve, reject) => {
    qqencodeMsg.encrypt(text, key).then((Msg) => {
      resolve(Msg);
    });
  });
};

async function addButtonToMeny(iconName, textContent, click) {
  var deleteLink = document.createElement("a");
  deleteLink.className = "q-context-menu-item q-context-menu-item--normal";
  deleteLink.setAttribute("aria-disabled", "false");
  deleteLink.setAttribute("role", "menuitem");
  deleteLink.setAttribute("tabindex", "-1");

  var icons = document.createElement("div");
  icons.className = "q-context-menu-item__icon q-context-menu-item__head";
  var q_context_menu_item = document.createElement("i");
  q_context_menu_item.className = "q-icon";
  q_context_menu_item.setAttribute("data-v-717ec976", "");
  q_context_menu_item.setAttribute("style", "--b4589f60: inherit; --6ef2e80d: 16px;");
  q_context_menu_item.innerHTML = await getIconText(iconName);
  icons.appendChild(q_context_menu_item);

  var button = document.createElement("span");
  button.className = "q-context-menu-item__text";
  button.textContent = textContent;

  deleteLink.appendChild(icons);
  deleteLink.appendChild(button);

  button.addEventListener("click", function () {
    click && click();
  });
  return deleteLink;
}

async function addDecodeMsgMenu(qContextMenu, message_element) {
  var decodeButton = await addButtonToMeny("jiemi", "解密", decodeButtonClick);
  var encodeforward = await addButtonToMeny("add1", "加密+1", encodeforwardClick);
  // var decodeCopy = await addButtonToMeny("jiemi", "复制", decodeCopyClick);
  const settings = await qqencodeMsg.getSettings();
  const key = settings.key;
  qContextMenu.appendChild(decodeButton);
  qContextMenu.appendChild(encodeforward);
  // qContextMenu.appendChild(decodeCopy);
  var targetElement = message_element;
  function decodeButtonClick() {
    targetElement = targetElement.parentNode;
    decodeMsgText(targetElement, settings);
    qContextMenu.remove();
  }
  function encodeforwardClick() {
    targetElement = targetElement.parentNode;
    encodeMsgForwardText(targetElement, key);
    qContextMenu.remove();
  }
  function decodeCopyClick() {
    targetElement = targetElement.parentNode;
    encodeMsgForwardText(targetElement, key);
    qContextMenu.remove();
  }
}

function autoDecodeUpMsg() {
  LLAPI.on("dom-up-messages", async (node) => {
    const settings = await qqencodeMsg.getSettings();
    const autoDecode = settings.autoDecode;
    const autoEncode = settings.autoEncode
    const key = settings.key;
    if (autoEncode) {
      await injectButton(key);
    }
    if (autoDecode) {
      const targetElement = node.querySelector(".msg-content-container").firstElementChild;
      decodeMsgText(targetElement, settings);
    }
  });
}

var buttonHtmlText;
async function injectButton(key) {
  const operation = document.querySelector(".operation");
  if (!operation.querySelector(".send-msg.encode-msg")) {
    operation.insertAdjacentHTML("afterbegin", buttonHtmlText);
    const buttonEncode = document.querySelector(".send-msg.encode-msg");
    buttonEncode.addEventListener("click", async () => {
      const ck_editor = document.querySelector(".ck-editor__main");
      const p_editor = ck_editor.firstElementChild.firstElementChild;
      encodeMsgForwardText(p_editor, key);
    });
  }
}

// 页面加载完成时触发
async function onLoad() {
  const buttonHtmlFilePath = `llqqnt://local-file/${pluginPath}/src/view/button.html`;
  // 插入设置页
  buttonHtmlText = await (await fetch(buttonHtmlFilePath)).text();
  LLAPI.add_qmenu(addDecodeMsgMenu);
  autoDecodeUpMsg();
}

async function getIconText(iconName) {
  const icons_json = await qqencodeMsg.getIcons();
  const qThemeValue = document.body.getAttribute("q-theme");
  const iconFilePath = `llqqnt://local-file/${pluginPath}/src/icons/${icons_json[iconName][qThemeValue]}`;
  const htmlText = await (await fetch(iconFilePath)).text();
  return htmlText;
}

async function setHtmlIcon() {
  var htmlicon = await getIconText("jiami");
  log("jiamiicon");
  document.querySelectorAll(".nav-item.liteloader").forEach(node => {
    if (node.textContent === "加密消息") {
      const icon_node = node.querySelector(".q-icon.icon");
      if (icon_node.firstElementChild) {
        return;
      }
      icon_node.insertAdjacentHTML('afterbegin', htmlicon);
    }
  });
}

// 打开设置界面时触发
async function onConfigView(view) {
  // 获取设置页文件路径
  const htmlFilePath = `llqqnt://local-file/${pluginPath}/src/view/view.html`;
  const cssFilePath = `llqqnt://local-file/${pluginPath}/src/view/view.css`;

  // 插入设置页
  const htmlText = await (await fetch(htmlFilePath)).text();
  view.insertAdjacentHTML("afterbegin", htmlText);

  // 插入设置页样式
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssFilePath;
  document.head.appendChild(link);

  // 插入设置图标
  await setHtmlIcon();
  const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  // 监听外观模式变化变更图标
  prefersColorScheme.addEventListener('change', async (event) => {
    await setHtmlIcon();
  });

  // 获取配置
  const settings = await qqencodeMsg.getSettings();
  const defaultSettings = await qqencodeMsg.getDefaultSettings();
  // 设置密钥输入框
  const encodeKey = view.querySelector("#encodeKey");
  if (encodeKey && (encodeKey.value !== settings.key)) {
    encodeKey.value = settings.key;
  }
  // 监听模糊度 number 输入框变化
  encodeKey.addEventListener('input', () => {
    encodeKey.value = encodeKey.value.replace(/[^\w\.\/]/ig, '');
    settings.key = encodeKey.value;
    qqencodeMsg.setSettings(settings);
  });

  // 按钮事件
  const create = view.querySelector("#qqencode-mode .ops-btns .create");
  const reset = view.querySelector("#qqencode-mode .ops-btns .reset");
  const apply = view.querySelector("#qqencode-mode .ops-btns .apply");
  create.addEventListener("click", async () => {
    encodeKey.value = self.crypto.randomUUID().replace(/[^\w\.\/]/ig, '');
    settings.key = encodeKey.value;
    qqencodeMsg.setSettings(settings);
  });
  reset.addEventListener("click", async () => {
    encodeKey.value = defaultSettings.key;
    settings.key = defaultSettings.key;
    settings.decodeMode = defaultSettings.decodeMode;
    resetModeList();
    qqencodeMsg.setSettings(settings);
  });
  apply.addEventListener("click", async () => {
    settings.key = encodeKey.value;
    log(settings);
    qqencodeMsg.setSettings(settings);
  });
  // 获取设置页复选框
  switchInitClick(view, "#autoEncode", settings, "autoEncode");
  switchInitClick(view, "#autoDecode", settings, "autoDecode");
  switchInitClick(view, "#openLog", settings, "writeLog");
  switchInitClick(view, "#errorDisplayRaw", settings, "errorDisplayRaw");
  const list_ctl = view.querySelector("#qqencode-mode .ops-selects");
  await initList(list_ctl, settings);
  var nowVersion = view.querySelector(".qqencode-mode-version");
  nowVersion.textContent = `当前版本:${settings.version}`;
  // var newVersion = view.querySelector(".qqencode-mode-new-version");
  // nowVersion.textContent = `当前版本:${settings.version}`;
  var github = view.querySelector(".qqencode-mode-github");
  github.addEventListener("click", () => {
    qqencodeMsg.openWeb(`https://github.com/GangPeter`);
  });
}

function switchInitClick(view, buttonSwitchID, settings, tagName) {
  const buttonSwitch = view.querySelector(buttonSwitchID);
  if (!settings[tagName]) {
    buttonSwitch.classList.remove("is-active");
  }
  buttonSwitch.addEventListener("click", () => {
    // 判断是否有is-active，如果有就移除，如果没有就添加
    if (buttonSwitch.classList.contains("is-active")) {
      buttonSwitch.classList.remove("is-active");
      // 修改settings的heti值为false
      settings[tagName] = false;
    } else {
      buttonSwitch.classList.add("is-active");
      // 修改settings的heti值为true
      settings[tagName] = true;
    }
    // 将修改后的settings保存到settings.json
    log(settings);
    qqencodeMsg.setSettings(settings);
  });
}

function resetModeList() {
  const modeList = document.querySelector("#qqencode-mode");
  // 选择框
  const pulldown_menu = modeList.querySelector(".q-pulldown-menu");
  const content = pulldown_menu.querySelector(".q-pulldown-menu-button .content");
  const pulldown_menu_list = pulldown_menu.querySelector(".q-pulldown-menu-list");
  const pulldown_menu_list_items = pulldown_menu_list.querySelectorAll(".q-pulldown-menu-list-item");
  // 移除所有条目的选择状态
  for (const pulldown_menu_list_item of pulldown_menu_list_items) {
    pulldown_menu_list_item.classList.remove("selected");
  }
  // 初始化选择框按钮显示内容
  const name = pulldown_menu.querySelector(`[data-value="0"] .content`);
  name.parentNode.classList.add("selected");
  content.value = name.textContent;
}

async function initList(list_ctl, config) {
  // 选择框按钮
  const pulldown_menu_button = list_ctl.querySelector(".q-pulldown-menu-button");
  pulldown_menu_button.addEventListener("click", event => {
    const context_menu = event.currentTarget.nextElementSibling;
    context_menu.classList.toggle("hidden");
  });

  addEventListener("pointerup", event => {
    if (event.target.closest(".q-pulldown-menu-button")) {
      return;
    }
    if (!event.target.closest(".q-context-menu")) {
      const context_menu = list_ctl.querySelector(".q-context-menu");
      context_menu.classList.add("hidden");
    }
  });


  // 选择框
  const pulldown_menu = list_ctl.querySelector(".q-pulldown-menu");
  const content = pulldown_menu.querySelector(".q-pulldown-menu-button .content");
  const pulldown_menu_list = pulldown_menu.querySelector(".q-pulldown-menu-list");
  const pulldown_menu_list_items = pulldown_menu_list.querySelectorAll(".q-pulldown-menu-list-item");

  // 初始化选择框按钮显示内容
  const setValueAndAddSelectedClass = async (value) => {
    const name = pulldown_menu.querySelector(`[data-value="${value}"] .content`);
    name.parentNode.classList.add("selected");
    content.value = name.textContent;
  };

  const value = config.decodeMode ? config.decodeMode : 0;
  await setValueAndAddSelectedClass(value);

  // 选择框条目点击
  pulldown_menu_list.addEventListener("click", async event => {
    const target = event.target.closest(".q-pulldown-menu-list-item");
    if (target && !target.classList.contains("selected")) {
      //下拉框菜单点击后，先隐藏下拉框本身
      const all_context_menu = list_ctl.querySelectorAll(".q-context-menu");
      for (const context_menu of all_context_menu) {
        context_menu.classList.add("hidden");
      }

      // 移除所有条目的选择状态
      for (const pulldown_menu_list_item of pulldown_menu_list_items) {
        pulldown_menu_list_item.classList.remove("selected");
      }

      // 添加选择状态
      target.classList.add("selected");

      // 获取选中的选项文本
      const text_content = target.querySelector(".content").textContent;
      content.value = text_content;

      const item_value = target.dataset.value;

      // 判断是哪个选择框的，单独设置
      config.decodeMode = parseInt(item_value);
      // 保存配置文件
      await qqencodeMsg.setSettings(config);
    }
  });
}


export { onLoad, onConfigView };
