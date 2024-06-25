<template>
  <div class="loading">
    <div class="k-spin">
      <span class="spin-load">
        <i class="iconfont icon-loading"></i>
      </span>

      <div class="loading-text">
        <slot>{{ currentTaskMeta.requestingSentence }}</slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useInfoStore } from '../../store/infoStore';
const { currentTaskMeta } = useInfoStore();
</script>

<style lang="scss">
.loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: $white;
  z-index: 999;
  .k-spin {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: $primary-main;
    .spin-load {
      display: inline-block;
      animation: ani-spin 1s linear infinite;
      .iconfont {
        font-size: 30px;
      }
    }
    .loading-text {
      margin-top: 6px;
    }

    @keyframes ani-spin {
      from {
        transform: rotate(0deg);
      }
      50% {
        transform: rotate(180deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  }
}
</style>
