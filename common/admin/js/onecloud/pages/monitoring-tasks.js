﻿'use strict';

var Monitoring = {
  config: {
    filterFormId: 'monitoring-filter',
    monitoringContainerId: 'monitoring-container',
    monitoringListId: 'monitoring-table',
    monitoringListUrl: 'list'
  },
  filter: {
    obj: {},
    config: {},
    submit: function () {
      Monitoring.item.curMonitoring = {};
      Monitoring.item.monitoringBlock.classList.remove('main-list__info--active');
      Monitoring.list.load();
    },
    init: function () {
      Monitoring.filter.obj = new Filter(Monitoring.config.filterFormId, Monitoring.filter.submit);
      Monitoring.filter.obj.init();
    }
  },
  list: {
    /*
     * Loads monitoring list due to filter values
     */
    load: function () {
      $.get(window.util.makeCorrectUrl(Monitoring.config.monitoringListUrl), Monitoring.filter.obj.getFilterObj(), function (data) {
        Monitoring.list.drawMonitoringList(data);
      }).fail(function (data) {
        handleAjaxErrors(data);
        console.log('Error getting monitoring');
      });
    },
    /*
     * Draw monitoring table due to server's response
     * @obj data - object from server with monitoring object list
     */
    drawMonitoringList: function (data) {
      var container = document.getElementById(Monitoring.config.monitoringContainerId),
        table = document.getElementById(Monitoring.config.monitoringListId),
        noResults = container.querySelector('.table--no-results'),
        list = table.querySelector('.monitoring__row-list');

      container.parentNode.classList.add('loading', 'loading--full');
      setTimeout(function () {
        while (list.firstChild) {
          list.removeChild(list.firstChild);
        }
        if (data.length > 0) {
          for (var i = 0; i < data.length; i++) {
            list.appendChild(Monitoring.list.drawSinglemonitoring(i, data[i]));
          }
          table.classList.remove('hidden');
          noResults.classList.add('hidden');

          if (data.length === 1) {
            Monitoring.item.load(data[0].Id, data[0].ProjectUid);
            list.firstChild.classList.add('active');
          }
        } else {
          table.classList.add('hidden');
          noResults.classList.remove('hidden');
        }

        container.parentNode.classList.remove('loading', 'loading--full');
      }, 400);

    },
    /*
        * Returns DOM object of a single monitoring item
        * @number index - index of a single monitoring object in a tickets list
        * @obj monitoring - object of a single monitoring data
    */
    drawSinglemonitoring: function (index, monitoring) {
      var tpl = document.getElementById('monitoring-row-template'),
        tplContainer = 'content' in tpl ? tpl.content : tpl,
        elem = tplContainer.querySelector('tr').cloneNode(true),
        dateCreate = new Date(monitoring.DateCreate);

      elem.dataset.id = monitoring.Id;
      elem.dataset.ProjectUid = monitoring.ProjectUid;

      window.util.fillDetalization('', monitoring, elem);
      elem.addEventListener('click', function () {
        if (monitoring.Id !== Monitoring.item.curMonitoring.monitoringId) {
          
          var rows = document.querySelectorAll('.monitoring__row');
          for (var i = 0; i < rows.length; i++) {
            rows[i].classList.remove('active');
          }
          
          this.classList.add('active');
          Monitoring.item.load(monitoring.Id, elem.dataset.ProjectUid);
          Monitoring.item.curMonitoring.Id = monitoring.Id;
        }
      });
      if (monitoring.Id === Monitoring.item.curMonitoring.Id) {
        elem.classList.add('active');
      };

      return elem;
    }
  },
  item: {
    config: {
      fields: {
        partner: document.getElementById('monitoring-partner'),
        Servers: document.getElementById('monitoring-tab-servers'),
        allServer: document.getElementById('monitoring-server-all'),
        activeServer: document.getElementById('monitoring-server-active')
      },
      actions: {
        restart: {
          url: '/restart',
          elem: document.getElementById('restart-btn'),
          addInput: '',
          modal: {
            title: 'Перезапустить задачу',
            introtext: '(Действие приводит к перезапуску данной задачи. При этом необходимо обратить внимание, что не все задачи возможно перезапустить)',
            hiddenComment: false,
            btnText: 'Перезапустить'
          }
        },
        block: {
          url: '/block',
          elem: document.getElementById('block-btn'),
          modal: {
            title: 'Заблокировать задачу',
            introtext: '(Данное действие приводит к запрету на выполнение действий с данной задачей)',
            hiddenComment: false,
            btnText: 'Заблокировать'
          }
        },
        unblock: {
          url: '/unblock',
          elem: document.getElementById('unblock-btn'),
          modal: {
            title: 'Разблокировать задачу',
            introtext: '(В результате данного действия другие пользователи смогут выполнять операции на данной задачей)',
            hiddenComment: false,
            btnText: 'Разблокировать'
          }
        }
      },
      curAction: ''
    },

    interval: false,
    curMonitoring: {},
    monitoringBlock: document.getElementById('monitoring-info'),
    filterControl: document.getElementById('collapse-filter-btn'),
    summaryBlock: document.getElementById('monitoring-summary'),
    descriptionBlock: document.getElementById('monitoring-description'),
    holdedAlertElems: document.querySelectorAll('.monitoring__header-alert'),
    actionsBlock: document.getElementById('monitoring-actions'),

    load: function (id) {
      var item = Monitoring.item;
      item.monitoringBlock.classList.add('loading', 'loading--full');

      $.get(window.util.makeCorrectUrl(id), function (data) {
        item.curMonitoring = data;
        item.fillMonitoringInfo(data);

      }).fail(function (data) {
        console.log('Error loading monitoring');
        handleAjaxErrors(data);
        item.monitoringBlock.classList.remove('loading', 'loading--full');
        });

    },
    fillMonitoringInfo: function (monitoringInfo) {
      var monitoringBlock = Monitoring.item.monitoringBlock,
        monitoringCreated = new Date(monitoringInfo.DateCreate),
        monitoringFields = Monitoring.item.config.fields,
        monitoringControls = Monitoring.item.config.controls,
        monitoringActions = Monitoring.item.config.actions,
        linkTomonitoringTasksElem = monitoringBlock.querySelector('[data-rel="monitoring-tasks"]'),
        holdRow = document.getElementById('hold-by-account');

      setTimeout(function () {
        // FILL TEXT INFO
        window.util.fillDetalization('monitoring-summary', monitoringInfo);
        window.util.fillDetalizationLinks('monitoring-summary', monitoringInfo.Links);
        if (linkTomonitoringTasksElem) {
          linkTomonitoringTasksElem.href += '&StateTask=';
        }

        Object.keys(monitoringActions).forEach(function (el) {
          if (monitoringActions[el].elem !== null) {
            window.util.setElementVisibility(monitoringActions[el].elem.parentNode, monitoringInfo.State !== 'Deleted');
          }
        })
        window.util.setElementVisibility(Monitoring.item.config.actions.restart.elem, monitoringInfo.CanRestart);
        window.util.setElementVisibility(Monitoring.item.config.actions.block.elem, !monitoringInfo.IsOnHold);
        window.util.setElementVisibility(Monitoring.item.config.actions.unblock.elem, monitoringInfo.IsOnHold);
        window.util.setElementVisibility(holdRow, monitoringInfo.IsOnHold);

        monitoringBlock.classList.add('main-list__info--active');
        monitoringBlock.classList.remove('loading', 'loading--full');
      }, 100);
    },
    
    
    initButtons: function () {
      var config = Monitoring.item.config,
        controls = config.controls,
        actions = config.actions;
      for (var item in actions) {
        if (actions[item].elem !== null) {
          actions[item].elem.dataset.action = item;
          actions[item].elem.addEventListener('click', function () {
            var action = this.dataset.action;

            Monitoring.modal.fill(Monitoring.item.config.actions[action], action);
            Monitoring.modal.curAction = action;
            $(Monitoring.modal.config.mBlock).modal('show');
            Monitoring.modal.removeErrors();

          });
        }
      };
    },
  },
  modal: {
    curAction: '',
    config: {
      mFormId: 'customer-comment-form',
      mForm: document.getElementById('customer-comment-form'),
      mBlock: document.getElementById('modal-comment'),
      mInput: document.getElementById('customer-inputs-block'),
      mTitle: document.getElementById('comment-title'),
      mIntro: document.getElementById('comment-intro'),
      mHidden: document.getElementById('comment-hidden'),
      mText: document.getElementById('comment-text'),
      mClose: document.getElementById('close-form'),
      mDropzone: false,
      mSendBtn: document.getElementById('comment-send')
    },
    /*
     * Fills modal window with the information, corresponding to the cliked button
     * @number ticketId - id of a ticket, to which modal is called for
     * @obj action - object of the chosen action
     */
    fill: function (actionObj, actionName) {
      var mConfig = Monitoring.modal.config;
      mConfig.mTitle.textContent = actionObj.modal.title;
      mConfig.mText.textContent = actionObj.modal.introtext;
      mConfig.mSendBtn.textContent = actionObj.modal.btnText;
      mConfig.mForm.action = window.util.makeCorrectUrl(Monitoring.item.curMonitoring.Id + actionObj.url);
      mConfig.mSendBtn.disabled = false;

      $(mConfig.mForm).unbind('submit').bind('submit', function (event) {
        event.preventDefault();
        Monitoring.modal.removeErrors();
        Monitoring.modal.submit.defaultSubmit(Monitoring.item.curMonitoring.Id, this);
      });
    },
    submit: {
      defaultSubmit: function (taskId, form) {
        var formInp = form.querySelector('.form-control');
        var sendObj = {};
        sendObj.taskId = taskId;
        sendPostRequest('#' + form.id, form.action, sendObj, Monitoring.modal.onSuccess, Monitoring.modal.onFail);
      }
    },
    
    clearSucc: function (deleteThis, deleteFrom) {
      deleteFrom.removeChild(deleteThis);
    },
    onSuccess: function (data, bool) {
      location.reload();
    },
    onFail: function (data) {
      handleAjaxErrors(data, '#' + Monitoring.modal.config.mFormId);
      Monitoring.modal.addErrorClass();
    },
    removeErrors: function () {
      var errParentBlock = document.getElementById(Monitoring.modal.config.mFormId);
      var errChild = errParentBlock.getElementsByClassName(errorSummaryClass);
      while (errChild.length > 0) {
        errChild[0].parentNode.removeChild(errChild[0]);
      }
    },
    addErrorClass: function () {
      var errChild = document.getElementsByClassName(errorSummaryClass);
      if (errChild.length > 0) {
        for (var i = 0; errChild.length > i; i++) {
          errChild[i].classList.add('alert', 'alert-danger');
        }
      }
    }
  },
  init: function () {
    window.util.makeCorrectUrl('');
    this.filter.init();
    this.list.load();
    this.item.initButtons();
  }
}
Monitoring.init();