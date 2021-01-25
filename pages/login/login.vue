<template>
	<view id="login">
		<uni-card title="登录" class="login-card">
			<uni-easyinput class="login-input" type="text" v-model="username" placeholder="用户名" />
			<uni-easyinput class="login-input" type="password" v-model="password" placeholder="密码" />
			<button class="login-input" type="primary" @click="login">登录</button>
		</uni-card>
	</view>
</template>

<script>

export default {
	data() {
		return {
			username: '',
			password: ''
		};
	},
	methods: {
		async login() {
			try {
				const { data } = await this.$http.post('/auth/login', { userName: this.username, password: this.password });
				uni.setStorageSync('token', data.data);
				uni.showToast({
					title: '登录成功',
					icon: 'none'
				});
				
				uni.reLaunch({
					url:'/pages/shows/shows'
				})
				
			} catch (e) {
				uni.showToast({
					title: e.message,
					icon: 'none'
				});
			}
		}
	}
};
</script>

<style>
.login-input {
	margin: 20rpx 0;
}
</style>
