<template>
	<view id="shows">
		<uni-popup ref="popupTickets" class="popupTickets">
			<view class="tickets-dia">
				<text>{{ modifyTicketItem.activity.name }}</text>
				<view class="tickets">
					<view class="tickets-item" v-for="(item, index) in modifyTicketItem.simulTickets" :index="`ticket-${index}`" :key="`ticket-${item.simulTicketVo.id}`">
						<text>{{ item.simulTicketVo.ticketName }}</text>
						<uni-number-box :value="item.simulTicketVo.ticketCount" @change="val => (item.simulTicketVo.ticketCount = Number(val))"></uni-number-box>
					</view>
				</view>
				<view class="popupBtns">
					<text style="color: #007AFF;" @click="modifyTicketSubmit()">提交</text>
					<text style="color: #DD524D;" @click="modifyTicketCancel()">取消</text>
				</view>
			</view>
		</uni-popup>
		<view class="profile ">
			<view class="profile-logo"><image :src="profile.logo" mode="aspectFit" class="profile-avatar"></image></view>
			<view class=".profile-information">
				<view>
					<text class="profile-name">{{ profile.name }}</text>
				</view>
				<view>
					<text class="profile-title">{{ profile.vipTitle }}</text>
				</view>
			</view>
			<button class="profile-btn" type="warn" @click="logout()" size="mini">{{ logoutBtnVal }}</button>
		</view>
		<view class="shows">
			<uni-collapse>
				<uni-collapse-item title="当前演出" :open="currentOpen">
					<view class="shows-card" v-for="(item, index) in currentItems" :index="`current-item-${index}`" :key="`current-item-${item.activity.id}`">
						<view class="shows-card-cover"><img :src="item.activity.coverUrl" class="shows-card-img" /></view>
						<view class="shows-card-info">
							<text class="shows-card-info-title">{{ item.activity.name }}</text>
							<uni-tag class="shows-card-info-ticket" :text="`余票：${item.activity.remain}`" type="warning" circle="true" inverted="true"></uni-tag>
							<uni-tag class="shows-card-info-day" :text="`剩余时间：${item.activity.restDays} 天`" type="success" circle="true" inverted="true"></uni-tag>
							<view class="shows-card-info-btn-group">
								<button class="shows-card-info-btn" type="primary" size="mini" @click="modifyTicket(item.activity.id)">修改票数</button>
								<button class="shows-card-info-btn" type="default" size="mini" @click="setRepeat(item.activity.id)">设为重复</button>
							</view>
						</view>
					</view>
				</uni-collapse-item>
				<uni-collapse-item title="重复任务" :open="repeatOpen">
					<view class="shows-card" v-for="(item, index) in tasks" :index="`tasks-item-${index}`" :key="`tasks-item-${item.id}`">
						<view class="shows-card-cover"><img :src="item.task.activity.coverUrl" class="shows-card-img" /></view>
						<view class="shows-card-info">
							<text class="shows-card-info-title">{{ item.task.activity.name }}</text>
							<uni-tag
								class="shows-card-info-ticket"
								:text="`重复时间：每${$moment(item.task.activity.beginTime).format('dddd HH:mm')}`"
								type="warning"
								circle="true"
								inverted="true"
							></uni-tag>
							<view class="shows-card-info-btn-group">
								<button class="shows-card-info-btn" type="primary" size="mini" @click="submitTask(index)">发布</button>
								<button class="shows-card-info-btn" type="warn" size="mini" @click="removeTask(index)">删除</button>
							</view>
						</view>
					</view>
					<button class="submitAllBtn" type="primary" @click="submitAllTasks()" size="mini">{{ tasksBtn }}</button>
				</uni-collapse-item>
			</uni-collapse>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			profile: {
				name: '未登录',
				logo: '/static/user.png',
				vipTitle: '请先登录'
			},
			cycleItems: [],
			currentItems: [],
			logoutBtnVal: '登录',
			currentOpen: false,
			repeatOpen: true,
			modifyTicketItem: {
				activity: {
					name: ''
				},
				simulTickets: []
			},
			tasks: [],
			tasksBtn: '请先设置重复任务'
		};
	},
	methods: {
		async fetch() {
			try {
				const res = await this.fetchProfile();
				await this.fetchActivities();
				if (res) {
					this.fetchTasks();
				}
			} catch (e) {
				uni.showToast({
					title: e.message,
					icon: 'none'
				});
			}
		},
		async fetchProfile() {
			let fetchSuccess = false;
			try {
				let token = uni.getStorageSync('token');
				const { data } = await this.$http.get(`/auth/getUserInfo?token=${token}`);
				this.resourceId = data.data.resourceId;
				uni.setStorageSync('id', data.data.resourceId);
				const res = await this.$http.post('/manage/resource/detail', { resourceType: 'brand', resourceId: this.resourceId });
				if (res.data.code == 200) {
					this.profile.name = res.data.data.brand.name;
					this.profile.logo = res.data.data.brand.logo;
					this.profile.vipTitle = res.data.data.brand.vipTitle;
					this.logoutBtnVal = '退出';
				}
				fetchSuccess = true;
			} catch (e) {
				uni.showToast({
					title: e.message,
					icon: 'none'
				});
			}
			return fetchSuccess;
		},
		async fetchActivities() {
			try {
				const { data } = await this.$http.post('/activity/resource/manage/list', {
					params: {
						activityStatus: 'NotBegin',
						resourceId: this.resourceId,
						resourceType: 'brand'
					}
				});
				for (let item of data.data.items) {
					const detial = await this.$http.get(`/activity/detail?activityId=${item.activity.id}`);
					item.activity.remain = detial.data.data.simulTickets
						.map(item => {
							return `${item.simulTicketVo.ticketName} : ${item.simulTicketVo.remainCount} 张`;
						})
						.join(' ');
					item.activity.restDays = this.$moment(item.activity.beginTime).diff(this.$moment.now(), 'days');
				}
				this.currentItems = data.data.items;
			} catch (e) {
				uni.showToast({
					title: e.message,
					icon: 'none'
				});
			}
		},
		fetchTasks() {
			let id = uni.getStorageSync('id');
			let config = uni.getStorageSync('config');
			if (config && config[id]) {
				this.tasks = config[id].tasks;
			}
			if (this.tasks.length == 0) {
				this.tasksBtn = '请先设置重复任务';
			} else {
				this.tasksBtn = '一键发布重复任务';
			}
		},
		async modifyTicket(id) {
			const detial = await this.$http.get(`/activity/detail?activityId=${id}`);
			this.modifyTicketItem = detial.data.data;
			this.$refs.popupTickets.open();
		},
		logout() {
			uni.removeStorageSync('token');
			uni.navigateTo({
				url: '../login/login'
			});
		},
		modifyTicketCancel() {
			this.$refs.popupTickets.close();
		},
		async setRepeat(id) {
			let config = uni.getStorageSync('config');
			let resourceId = uni.getStorageSync('id');
			const { data } = await this.$http.get(`/activity/detail?activityId=${id}`);
			let { checker, checkoutUser, enableSimulTicket, enableLimitPresent, limitPresentCount } = data.data;
			let { coverMediaId, coverUrl, detail, highLight, name, beginTime, endTime } = data.data.activity;
			let activityHosts = data.data.activityHosts.map(item => {
				return {
					type: item.hostType.toLowerCase(),
					priority: item.priority,
					id: item[item.hostType.toLowerCase()].id,
					name: item[item.hostType.toLowerCase()].name
				};
			});
			let activityLabels = data.data.activityStyles.map(item => {
				return {
					id: item.id,
					name: item.name,
					priority: 0
				};
			});
			let simulTickets = data.data.simulTickets.map(item => {
				return {
					beginTime: item.simulTicketVo.beginTime,
					endTime: item.simulTicketVo.endTime,
					remainCount: item.simulTicketVo.ticketCount,
					ticketCount: item.simulTicketVo.ticketCount,
					ticketName: item.simulTicketVo.ticketName,
					ticketPrice: item.simulTicketVo.ticketPrice,
					ticketType: item.simulTicketVo.ticketType,
					allowPresentCount: item.simulTicketVo.allowPresentCount,
					allowCheckinCount: item.simulTicketVo.allowCheckinCount,
					enablePresentMultiple: item.enablePresentMultiple,
					enableCheckinMultiple: item.enablePresentMultiple
				};
			});
			let taskData = {
				url: '',
				urlType: '',
				createType: 'MANUAL',
				submitter: {
					resourceId: resourceId,
					resourceType: 'brand'
				},
				activity: {
					activityArtists: [],
					activityHosts,
					activityLabels,
					activityVenue: {
						id: data.data.activityVenue.id,
						name: data.data.activityVenue.name,
						city: data.data.activityVenue.city
					},
					coverMediaId,
					coverUrl,
					detail,
					highLight,
					name,
					beginTime,
					endTime
				},
				ticket: {
					checker,
					checkoutUser,
					enableSimulTicket,
					enableLimitPresent,
					limitPresentCount,
					simulTickets
				}
			};
			if (!config || !config[resourceId]) {
				config = {
					[resourceId]: {
						tasks: [{ id: id, task: taskData }]
					}
				};
				uni.setStorageSync('config', config);
				uni.showToast({
					title: '设为重复成功,可在重复任务中一键发布',
					icon: 'none'
				});
				this.fetchTasks();
			} else {
				let idList = config[resourceId].tasks.map(item => item.id);
				if (idList.includes(id)) {
					uni.showToast({
						title: '任务已存在',
						icon: 'none'
					});
				} else {
					config[resourceId].tasks.push({ id: id, task: taskData });
					uni.setStorageSync('config', config);
					uni.showToast({
						title: '设为重复成功,可在重复任务中一键发布',
						icon: 'none'
					});
					this.fetchTasks();
				}
			}
		},
		removeTask(index) {
			let config = uni.getStorageSync('config');
			let resourceId = uni.getStorageSync('id');
			config[resourceId].tasks.splice(index, 1);
			uni.setStorageSync('config', config);
			uni.showToast({
				title: '任务已删除',
				icon: 'none'
			});
			this.fetchTasks();
		},
		async submitTask(index) {
			let config = uni.getStorageSync('config');
			let resourceId = uni.getStorageSync('id');
			let task = config[resourceId].tasks[index].task;
			let convertTime = time => {
				let repeatDay = this.$moment(time).days();
				let taskTime = `${this.$moment()
					.days(7 + repeatDay)
					.format('YYYY/MM/DD')} ${this.$moment(time).format('HH:mm')}`;
				return this.$moment(taskTime).valueOf();
			};
			let beginTime = convertTime(task.activity.beginTime);
			let endTime = convertTime(task.activity.endTime);
			let now = this.$moment().valueOf();
			task.activity.beginTime = beginTime;
			task.activity.endTime = endTime;
			task.ticket.simulTickets.forEach(item => {
				item.beginTime = now;
				item.endTime = beginTime;
			});
			let postSuccess = false;
			try {
				const res = await this.$http.post('/activity/submit', task);
				uni.showToast({
					title: res.data.msg,
					icon: 'none'
				});
				postSuccess = true;
			} catch (e) {
				uni.showToast({
					title: e.message,
					icon: 'none'
				});
			}
			return postSuccess;
		},
		async submitAllTasks() {
			let config = uni.getStorageSync('config');
			let resourceId = uni.getStorageSync('id');
			let tasks = config[resourceId].tasks;
			if (this.tasks.length == 0) {
				this.currentOpen = true;
			} else {
				let successList = [];
				let failList = [];
				for (let i = 0; i < tasks.length; i++) {
					const res = await this.submitTask(i);
					if (res) {
						successList.push(i);
					} else {
						failList.push(i);
					}
				}
				uni.showToast({
					title:
						failList.length == 0
							? `共提交任务${tasks.length}个，成功${successList.length}个，失败${failList.length}个`
							: `共提交任务${tasks.length}个，成功${successList.length}个，失败${failList.length}个 失败任务为${failList.join(' ')}`,
					icon: 'none'
				});
			}
		},
		async modifyTicketSubmit() {
			try {
				let { checker, checkoutUser, simulTickets, enableSimulTicket, enableLimitPresent, limitPresentCount } = this.modifyTicketItem;
				simulTickets = simulTickets.map(item => {
					let { ticketCount, ticketType, ticketName, allowPresentCount, allowCheckinCount, ticketPrice, remainCount, beginTime, endTime } = item.simulTicketVo;
					let { enablePresentMultiple, enableCheckinMultiple } = item;
					return {
						ticketCount,
						ticketType,
						ticketName,
						allowPresentCount,
						allowCheckinCount,
						ticketPrice,
						remainCount,
						beginTime,
						endTime,
						enablePresentMultiple,
						enableCheckinMultiple
					};
				});
				const postData = {
					activityId: this.modifyTicketItem.activity.id,
					submitter: {
						resourceType: 'brand',
						resourceId: uni.getStorageSync('id')
					},
					checker,
					checkoutUser,
					simulTickets,
					enableSimulTicket,
					enableLimitPresent,
					limitPresentCount
				};
				const res = await this.$http.post('/ticket/update', postData);
				if (res.data.code == 200) {
					this.$refs.popupTickets.close();
					uni.showToast({
						icon: 'none',
						title: res.data.msg
					});
				}
			} catch (e) {
				uni.showToast({
					icon: 'none',
					title: res.data.msg
				});
			}
		},
		async onLoad() {
			let token = uni.getStorageSync('token');
			if (token) {
				await this.fetch();
			}
		},
		async onPullDownRefresh() {
			await this.fetch()
			await this.$delay(1000)
			uni.stopPullDownRefresh();	
		}
	}
};
</script>

<style>
#shows {
	padding: 15rpx;
}
.profile {
	display: flex;
	flex-flow: row nowrap;
	justify-content: space-between;
	align-items: center;
	padding: 10rpx;
	border: #d3d3d3 solid 2px;
	border-radius: 5px;
}
.profile-logo {
	flex: 0 0 20%;
}
.profile-avatar {
	max-width: 50px;
	max-height: 50px;
	border-radius: 50%;
}
.profile-information {
	flex: 0 0 50%;
}
.profile-btn {
	flex: 0 0 20%;
}
.profile-name {
	font-size: 16px;
	font-weight: bolder;
}
.profile-title {
	font-size: 13px;
	color: #999999;
}
.shows {
	margin-top: 15rpx;
}
.shows-card {
	margin: 10rpx;
	padding: 10rpx;
	background-color: #ffffff;
	display: flex;
	flex-flow: row nowrap;
	justify-content: flex-start;
	align-items: center;
}
.shows-card-cover {
	max-width: 200rpx;
	margin-right: 20rpx;
}
.shows-card-img {
	width: 100%;
}
.shows-card-info {
	display: flex;
	flex-flow: column nowrap;
	justify-content: space-between;
	align-items: flex-start;
}
.shows-card-info-title {
	font-size: 15px;
	font-weight: bold;
}
[class*='shows-card-info'] {
	margin: 10rpx 0;
}
.shows-card-info-btn {
	min-width: 3em;
	margin-right: 10rpx;
}
.tickets-dia {
	width: 70vw;
	height: 30vh;
	border-radius: 10rpx;
	background-color: white;
	display: flex;
	flex-flow: column nowrap;
	justify-content: space-around;
	align-items: center;
	padding: 20rpx;
}
.tickets {
	width: 100%;
	display: flex;
	flex-flow: column nowrap;
	justify-content: space-between;
	align-items: flex-start;
}
.tickets-item {
	width: 100%;
	display: flex;
	flex-flow: row nowrap;
	justify-content: space-evenly;
	align-items: center;
	margin: 20rpx 0;
}
.popupBtns {
	width: 100%;
	display: flex;
	flex-flow: row nowrap;
	justify-content: space-around;
	align-items: center;
}
.shows-card-info-btn-group {
	display: flex;
	flex-flow: row nowrap;
	justify-content: flex-start;
}
.submitAllBtn {
	margin: 10rpx;
}
</style>
